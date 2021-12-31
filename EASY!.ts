import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    IModify,
    IModifyCreator,
    IPersistence,
    IRead
} from '@rocket.chat/apps-engine/definition/accessors'
import {IApiEndpointMetadata} from '@rocket.chat/apps-engine/definition/api'
import {App} from '@rocket.chat/apps-engine/definition/App'
import {IMessage} from '@rocket.chat/apps-engine/definition/messages'
import {IRoom, RoomType} from '@rocket.chat/apps-engine/definition/rooms'
import {
    ISetting,
    ISettingSelectValue,
    SettingType
} from '@rocket.chat/apps-engine/definition/settings'
import {
    ISlashCommand,
    ISlashCommandPreview,
    ISlashCommandPreviewItem,
    SlashCommandContext
} from '@rocket.chat/apps-engine/definition/slashcommands'
import {IUser} from '@rocket.chat/apps-engine/definition/users'

/* tslint:disable: variable-name */

interface IEasyConfigurationHandlers {
    setting: EasyAppSetting
}

class EasyAppCommand implements ISlashCommand {
    public command: string
    public i18nDescription: string
    public i18nParamsExample: string
    public providesPreview: boolean = false
    public hidden: boolean = false

    private readonly commandMap: Map<string, EasyAppCommand> = new Map()
    private readonly allowedRoles: Array<string> = ['admin']

    private readonly __app?: App
    private __setting?: EasyAppSetting

    private __parent: EasyAppCommand | null = null
    private __slash: {__?: EasyAppCommand}

    private __me: IUser
    private __sender: IUser
    private __room: IRoom
    private __context: SlashCommandContext
    private __read: IRead
    private __modify: IModify
    private __http: IHttp
    private __persis: IPersistence

    protected get parent(): EasyAppCommand {
        return this.__parent as EasyAppCommand
    }

    protected get slash(): EasyAppCommand {
        return this.__slash.__ as EasyAppCommand
    }

    protected get app(): App {
        return this.slash?.__app as App
    }

    protected get me(): IUser {
        return this.slash?.__me as IUser
    }

    protected get sender(): IUser {
        return this.slash?.__sender as IUser
    }

    protected get room(): IRoom {
        return this.slash?.__room as IRoom
    }

    protected get context(): SlashCommandContext {
        return this.slash?.__context as SlashCommandContext
    }

    protected get read(): IRead {
        return this.slash?.__read as IRead
    }

    protected get modify(): IModify {
        return this.slash?.__modify as IModify
    }

    protected get http(): IHttp {
        return this.slash?.__http as IHttp
    }

    protected get persis(): IPersistence {
        return this.slash?.__persis as IPersistence
    }

    protected get setting(): EasyAppSetting {
        return this.slash?.__setting as EasyAppSetting
    }

    /*
        Old executor
    */
    private __executor: typeof this.executor

    /**
     * If a slashcommand pass these depending on its command chain
     * No need to pass these through other commands.
     * They'll use the slash's members anyway
     */
    constructor(app?: App, cHandlers?: Partial<IEasyConfigurationHandlers>) {
        this.__app = app
        this.__setting = cHandlers?.setting

        this.__executor = this.executor

        this.executor = async (
            context: SlashCommandContext,
            read: IRead,
            modify: IModify,
            http: IHttp,
            persis: IPersistence,
            args?: Array<string>
        ): Promise<void> => {
            /**
             * __parent === null means this is the SlashCommand
             */
            if (this.__parent == null) {
                this.__sender = context.getSender()
                this.__room = context.getRoom()
                this.__me = (await read.getUserReader().getAppUser()) as IUser
                this.__context = context
                this.__read = read
                this.__modify = modify
                this.__http = http
                this.__persis = persis

                // makes sure __slash uses existing object
                // or creates a new one, and assigns __ to this
                // more on this in registerCommand
                this.__slash = this.__slash || {__: this}
                this.__slash.__ = this.__slash.__ || this

                args = context.getArguments()
            }

            await this.handleCommands(args as Array<string>)
        }
    }

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        args?: Array<string>
    ): Promise<void> {
        /* entrypoint */
    }

    public async previewer?(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<ISlashCommandPreview>

    public async executePreviewItem?(
        item: ISlashCommandPreviewItem,
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence
    ): Promise<void>

    /**
     * checks if current command has subcommand handler or not
     * @param command command name
     * @returns true if current command has a mapped command handler, false otherwise
     */
    public hasCommand(command: string): boolean {
        return this.commandMap.has(command)
    }

    /**
     * Converts exiting EasyAppCommand to a regiterable SlashCommand
     * @param handler an ISlashCommand object without the properties 'command' and 'executor', optionally an alias
     * @returns SlashCommand
     */
    public slashCommand(
        handler: Partial<Omit<ISlashCommand, 'command' | 'executor'> & {alias: string}>
    ): EasyAppCommand {
        this.i18nDescription = handler.i18nDescription ?? this.i18nDescription
        this.i18nParamsExample = handler.i18nParamsExample ?? this.i18nParamsExample
        this.providesPreview = handler.providesPreview ?? this.providesPreview
        if (handler.previewer !== undefined) {
            this.previewer = handler.previewer
        }
        if (handler.executePreviewItem !== undefined) {
            this.executePreviewItem = handler.executePreviewItem
        }
        if (handler.alias !== undefined) {
            this.command = handler.alias
        }
        return this
    }

    /**
     * Generator function that yields allowed command handlers
     */
    public *getCommands() {
        for (const [, commandHandler] of this.commandMap) {
            if (commandHandler.allowed()) {
                yield commandHandler
            }
        }
    }

    /**
     * @returns true if command has any subcommands
     */
    public hasCommands(): boolean {
        return this.commandMap.size > 0
    }

    /**
     *
     * @param name name of the command
     * @returns command handler if command exists and allowed, undefined otherwise
     */
    public getCommand(name: string): EasyAppCommand | undefined {
        const handler: EasyAppCommand | undefined = this.commandMap.get(name)
        return this.commandMap.get(name)?.allowed() ? this.commandMap.get(name) : undefined
    }

    /**
     * Registers passed command as a subcommand
     * @param handler A EasyAppCommand instance
     */
    public registerCommand(handler: EasyAppCommand): void {
        handler.__parent = this

        this.__slash = handler.__slash = this.__slash || handler.__slash || {}

        this.commandMap.set(handler.command, handler)
    }

    /**
     * @returns true if command allowed false otherwise
     */
    public allowed(): boolean {
        return !this.hidden ? true : this.notafraud()
    }

    /**
     * @returns true if current sender belongs to one of the allowed roles, false otherwise
     */
    public notafraud(): boolean {
        return this.sender.roles.some(
            (role: string): boolean => this.allowedRoles.indexOf(role) !== -1
        )
    }

    /**
     *
     * @param user
     * @param text
     * @returns
     */
    protected async notifyUserOnSuccessSimple(user: IUser, text: string): Promise<void> {
        return await notifyUserOnSuccessSimple(
            {
                sender: this.me,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    protected async notifySenderOnSuccessSimple(text: string): Promise<void> {
        return await this.notifyUserOnSuccessSimple(this.sender, text)
    }

    protected async notifyUserOnFailureSimple(user: IUser, text: string): Promise<void> {
        return await notifyUserOnFailureSimple(
            {
                sender: this.me,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    protected async notifySenderOnFailureSimple(text: string): Promise<void> {
        return await this.notifyUserOnFailureSimple(this.sender, text)
    }

    protected async notifyUserSimple(user: IUser, text: string): Promise<void> {
        await notifyUserSimple(
            {
                sender: this.me,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    protected async notifySenderSimple(text: string): Promise<void> {
        return await this.notifyUserSimple(this.sender, text)
    }

    protected async notifyUser(
        user: IUser,
        message: Omit<IMessage, 'sender' | 'room'>
    ): Promise<void> {
        return await notifyUser(
            {
                sender: this.me,
                modify: this.modify,
                user,
                room: this.room
            },
            message
        )
    }

    protected async notifySender(message: Omit<IMessage, 'sender' | 'room'>): Promise<void> {
        return await this.notifyUser(this.sender, message)
    }

    protected async sendDirectToUser(
        user: IUser,
        message: Omit<IMessage, 'sender' | 'room'>
    ): Promise<void> {
        return await sendDirectToUser(
            {
                read: this.read,
                sender: this.me,
                modify: this.modify,
                user
            },
            message
        )
    }

    protected async sendDirectToSender(message: Omit<IMessage, 'sender' | 'room'>): Promise<void> {
        return await this.sendDirectToUser(this.sender, message)
    }

    protected async sendDirectToUserSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserSimple(
            {
                read: this.read,
                sender: this.me,
                modify: this.modify,
                user
            },
            text
        )
    }

    protected async sendDirectToSenderSimple(text: string): Promise<void> {
        return await this.sendDirectToUserSimple(this.sender, text)
    }

    protected async sendDirectToUserOnSuccessSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserOnSuccessSimple(
            {
                read: this.read,
                sender: this.me,
                modify: this.modify,
                user
            },
            text
        )
    }

    protected async sendDirectToSenderOnSuccessSimple(text: string): Promise<void> {
        return await this.sendDirectToUserOnSuccessSimple(this.sender, text)
    }

    protected async sendDirectToUserOnFailureSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserOnFailureSimple(
            {
                read: this.read,
                sender: this.me,
                modify: this.modify,
                user
            },
            text
        )
    }

    protected async sendDirectToSenderOnFailureSimple(text: string): Promise<void> {
        return await this.sendDirectToUserOnFailureSimple(this.sender, text)
    }

    // handles subcommand execution
    private async handleCommands(args: Array<string>): Promise<void> {
        if (!this.hasCommands()) {
            return await this.__executor(
                this.context,
                this.read,
                this.modify,
                this.http,
                this.persis,
                args
            )
        }
        const [command, ...commandArgs]: Array<string> = args

        const handler: EasyAppCommand | undefined = this.getCommand(command)

        if (handler === undefined) {
            if (this.constructor.prototype.hasOwnProperty('executor')) {
                return await this.__executor(
                    this.context,
                    this.read,
                    this.modify,
                    this.http,
                    this.persis,
                    args
                )
            }
            return await this.mamaaa(args)
        }

        return await handler.executor(
            this.context,
            this.read,
            this.modify,
            this.http,
            this.persis,
            commandArgs
        )
    }

    // wet the bed ? cry to yo mama
    private async mamaaa(args: Array<string>): Promise<void> {
        return this.hasCommand('help')
            ? /* mama help?*/
              await this.getCommand('help')?.executor(
                  this.context,
                  this.read,
                  this.modify,
                  this.http,
                  this.persis,
                  args
              )
            : /* mama no help */
              await this.notifySender({
                  text: `unknown command ${args.join(' ')}`
              })
    }
}

// tslint:disable-next-line: max-classes-per-file
class EasyHelpCommand extends EasyAppCommand {
    public command: string = 'help'

    // prettier-ignore
    public banner: (() => Promise<string>) | string
        = `${'-'.repeat(15)}\n|  *HELP!!*  |\n${'-'.repeat(15)}\n`

    constructor() {
        super()
    }

    public unknownCommand: ((args: Array<string>) => Promise<string> | string) | string = (
        args: Array<string>
    ): string =>
        `unknown command \`${args?.join(' ')}\` ...nothing to do...please run \`/${
            this.slash?.command
        } [command]...[subcommand] help\` for a list of available commands and their description.\n`

    public async executor(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        args?: Array<string>
    ): Promise<void> {
        let text = ''
        if (args && args.length > 0) {
            text +=
                typeof this.unknownCommand === 'string'
                    ? this.unknownCommand
                    : this.unknownCommand(args)
        }

        text += typeof this.banner === 'string' ? this.banner : await this.banner()
        text += `\`${this.parent?.command}\`: ${this.parent?.i18nDescription}\n`
        text += '`'.repeat(3).concat('\n')

        for (const handler of this.parent?.getCommands() || this.getCommands()) {
            text += `${' '.repeat(4)}${handler.command}:\n${' '.repeat(8)}${
                handler.i18nDescription
            }\n`
        }

        text += '`'.repeat(3)
        await this.notifySenderSimple(text)
    }
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

type IEasyAppSettingValue = any

type IEasyAppSettingValueCorrectFunction = (
    v: IEasyAppSettingValue,
    accessors?: IAppAccessors
) => Promise<IEasyAppSettingValue>

type IEasyAppSettingValueFromFunction = (accessors?: IAppAccessors) => Promise<IEasyAppSettingValue>

type IEasyAppSetting = Optional<ISetting, 'packageValue'> & {
    correct?: IEasyAppSettingValueCorrectFunction
    from?: IEasyAppSettingValueFromFunction
}

// tslint:disable-next-line: max-classes-per-file
class EasyAppSetting {
    [_id: string]: any

    private readonly __app: App
    private readonly __accessors: IAppAccessors

    constructor(app: App) {
        this.__app = app
        this.__accessors = app.getAccessors()
    }

    protected get app(): App {
        return this.__app
    }

    protected get accessors(): IAppAccessors {
        return this.__accessors
    }

    protected get read(): IRead {
        return this.__accessors.reader
    }

    protected get http(): IHttp {
        return this.__accessors.http
    }

    protected get environment(): IEnvironmentRead {
        return this.__accessors.environmentReader
    }

    protected get endpoints(): Array<IApiEndpointMetadata> {
        return this.__accessors.providedApiEndpoints
    }

    public async registerSettings(
        configuration: IConfigurationExtend,
        settings: Array<IEasyAppSetting>
    ): Promise<void> {
        await Promise.all(
            settings.map(async (setting: IEasyAppSetting) => {
                //
                this[`get${setting.id}`] = async (): Promise<IEasyAppSettingValue> =>
                    await this.getValue(setting)

                await configuration.settings.provideSetting(await this.getSetting(setting))
            })
        )
    }

    public async getSetting(appSetting: IEasyAppSetting): Promise<ISetting> {
        const {correct, from, ...setting} = appSetting

        const v = await (async (
            c: IEasyAppSettingValueCorrectFunction,
            f: IEasyAppSettingValueFromFunction,
            s: Optional<ISetting, 'packageValue'>
        ): Promise<{value?: any; values?: Array<ISettingSelectValue>}> => {
            const st: string = s.type === SettingType.SELECT ? 'values' : 'value'

            return {
                [st]:
                    setting[st] ??
                    (correct
                        ? await correct.call(
                              setting,
                              await from?.call(setting, this.__accessors),
                              this.__accessors
                          )
                        : await from?.call(setting, this.__accessors))
            }
        })(
            correct as IEasyAppSettingValueCorrectFunction,
            from as IEasyAppSettingValueFromFunction,
            setting
        )

        return {
            ...setting,
            packageValue: setting.packageValue ?? v.values?.[0] ?? v.value,
            ...v
        } as ISetting
    }

    public async getValue(setting: IEasyAppSetting): Promise<IEasyAppSettingValue> {
        return setting.correct
            ? setting.correct(
                  await this.environment.getSettings().getValueById(setting.id),
                  this.accessors
              )
            : await this.environment.getSettings().getValueById(setting.id)
    }
}

export {
    EasyAppCommand,
    EasyHelpCommand,
    IEasyAppSetting,
    IEasyAppSettingValue,
    IEasyAppSettingValueCorrectFunction,
    IEasyAppSettingValueFromFunction,
    EasyAppSetting
}

type ImplicitOrExplicitMessageSenderArgs = Partial<
    {context: SlashCommandContext; read: IRead} & {
        sender: IUser
        user: IUser
        room: IRoom
    }
> & {modify: IModify}

const notifyUser = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    message: Omit<IMessage, 'sender' | 'room'>
): Promise<void> => {
    const {context, read, modify, sender, user, room} = args
    await modify.getNotifier().notifyUser(user || (context?.getSender() as IUser), {
        sender: sender || ((await read?.getUserReader().getAppUser()) as IUser),
        room: room || (context?.getRoom() as IRoom),
        ...message
    })
}

const notifyUserSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await notifyUser(args, {text})
}

const notifyUserSimpleWithColor = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    color: string,
    text: string
): Promise<void> => {
    await notifyUser(args, {attachments: [{color, text}]})
}

const notifyUserOnSuccessSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await notifyUserSimpleWithColor(args, 'green', text)
}

const notifyUserOnFailureSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await notifyUserSimpleWithColor(args, 'red', text)
}

const sendDirectToUser = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    message: Omit<IMessage, 'sender' | 'room'>
): Promise<void> => {
    const {context, read, modify} = args

    const sender: IUser = args.sender || ((await read?.getUserReader().getAppUser()) as IUser)

    const user: IUser = args.user || (context?.getSender() as IUser)

    const usernames: Array<string> = [user, sender].map((u: IUser): string => u.username)

    const creator: IModifyCreator = modify.getCreator()

    let room: IRoom | undefined = await read?.getRoomReader().getDirectByUsernames(usernames)

    if (room === undefined) {
        const roomId = await creator.finish(
            creator
                .startRoom()
                .setMembersToBeAddedByUsernames(usernames)
                .setType(RoomType.DIRECT_MESSAGE)
                .setCreator(sender)
        )
        room = (await read?.getRoomReader().getById(roomId)) as IRoom
    }
    await creator.finish(
        creator.startMessage({
            room,
            sender,
            ...message
        })
    )
}

const sendDirectToUserSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await sendDirectToUser(args, {text})
}

const sendDirectToUserSimpleWithColor = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    color: string,
    text: string
): Promise<void> => {
    await sendDirectToUser(args, {attachments: [{color, text}]})
}

const sendDirectToUserOnSuccessSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await sendDirectToUserSimpleWithColor(args, 'green', text)
}

const sendDirectToUserOnFailureSimple = async (
    args: ImplicitOrExplicitMessageSenderArgs,
    text: string
): Promise<void> => {
    await sendDirectToUserSimpleWithColor(args, 'red', text)
}

export {
    notifyUser,
    notifyUserSimple,
    notifyUserOnSuccessSimple,
    notifyUserOnFailureSimple,
    sendDirectToUser,
    sendDirectToUserSimple,
    sendDirectToUserOnSuccessSimple,
    sendDirectToUserOnFailureSimple
}
