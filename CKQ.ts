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

const notifyUser = async (
    {
        read,
        modify,
        user,
        room
    }: {
        read: IRead
        modify: IModify
        user: IUser
        room: IRoom
    },
    message: Omit<IMessage, 'sender' | 'room'>
): Promise<void> => {
    await modify.getNotifier().notifyUser(user, {
        sender: (await read.getUserReader().getAppUser()) as IUser,
        room,
        ...message
    })
}

const notifyUserSimple = async (
    {
        read,
        modify,
        user,
        room
    }: {
        read: IRead
        modify: IModify
        user: IUser
        room: IRoom
    },
    text: string
): Promise<void> => {
    await notifyUser({read, modify, user, room}, {text})
}

const notifyUserSimpleWithColor = async (
    {
        read,
        modify,
        user,
        room
    }: {
        read: IRead
        modify: IModify
        user: IUser
        room: IRoom
    },
    color: string,
    text: string
): Promise<void> => {
    await notifyUser({read, modify, user, room}, {attachments: [{color, text}]})
}

const notifyUserOnSuccessSimple = async (
    {
        read,
        modify,
        user,
        room
    }: {
        read: IRead
        modify: IModify
        user: IUser
        room: IRoom
    },
    text: string
): Promise<void> => {
    await notifyUserSimpleWithColor({read, modify, user, room}, 'green', text)
}

const notifyUserOnFailureSimple = async (
    {
        read,
        modify,
        user,
        room
    }: {
        read: IRead
        modify: IModify
        user: IUser
        room: IRoom
    },
    text: string
): Promise<void> => {
    await notifyUserSimpleWithColor({read, modify, user, room}, 'red', text)
}

const sendDirectToUser = async (
    {
        read,
        modify,
        user
    }: {
        read: IRead
        modify: IModify
        user: IUser
    },
    message: Omit<IMessage, 'sender' | 'room'>
): Promise<void> => {
    const me = (await read.getUserReader().getAppUser()) as IUser

    const usernames: Array<string> = [user, me].map((u: IUser) => u.username)

    const creator: IModifyCreator = modify.getCreator()

    let room: IRoom = await read.getRoomReader().getDirectByUsernames(usernames)

    if (room === undefined) {
        const roomId = await creator.finish(
            creator
                .startRoom()
                .setMembersToBeAddedByUsernames(usernames)
                .setType(RoomType.DIRECT_MESSAGE)
                .setCreator(me)
        )
        room = (await read.getRoomReader().getById(roomId)) as IRoom
    }
    await creator.finish(
        creator.startMessage({
            room,
            sender: me,
            ...message
        })
    )
}

const sendDirectToUserSimple = async (
    {
        read,
        modify,
        user
    }: {
        read: IRead
        modify: IModify
        user: IUser
    },
    text: string
): Promise<void> => {
    await sendDirectToUser({read, modify, user}, {text})
}

const sendDirectToUserSimpleWithColor = async (
    {
        read,
        modify,
        user
    }: {
        read: IRead
        modify: IModify
        user: IUser
    },
    color: string,
    text: string
): Promise<void> => {
    await sendDirectToUser({read, modify, user}, {attachments: [{color, text}]})
}

const sendDirectToUserOnSuccessSimple = async (
    {
        read,
        modify,
        user
    }: {
        read: IRead
        modify: IModify
        user: IUser
    },
    text: string
): Promise<void> => {
    await sendDirectToUserSimpleWithColor({read, modify, user}, 'green', text)
}

const sendDirectToUserOnFailureSimple = async (
    {
        read,
        modify,
        user
    }: {
        read: IRead
        modify: IModify
        user: IUser
    },
    text: string
): Promise<void> => {
    await sendDirectToUserSimpleWithColor({read, modify, user}, 'red', text)
}

class CKQommand implements ISlashCommand {
    public command: string
    public i18nDescription: string
    public i18nParamsExample: string
    public providesPreview: boolean = false
    public hidden: boolean = false

    // honestly this isn't necessary
    // i just wanted to name the main method flyingChickens
    // pls don't ask why :"D
    public readonly commands = this.flyingChickens
    // other similar stuff
    public readonly hasCommand = this.sugar
    public readonly hasCommands = this.cryingChildren

    private readonly commandMap: Map<string, CKQommand> = new Map()
    private readonly allowedRoles: Array<string> = ['admin']

    // tslint:disable: variable-name
    private readonly __app?: App

    private __parent: CKQommand | null = null
    private __slash: {__?: CKQommand}

    private __me: IUser
    private __sender: IUser
    private __room: IRoom
    private __context: SlashCommandContext
    private __read: IRead
    private __modify: IModify
    private __http: IHttp
    private __persis: IPersistence

    private __setting: CKQSetting
    // tslint:enable: variable-name

    protected get app(): App {
        return this.__app as App
    }

    protected get parent(): CKQommand | null {
        return this.__parent
    }

    protected get slash(): CKQommand {
        return this.__slash.__ as CKQommand
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

    protected get setting(): CKQSetting {
        return this.slash?.__setting as CKQSetting
    }

    // tslint:disable-next-line: variable-name
    private __executor: typeof this.executor

    constructor(app?: App) {
        this.__app = app

        this.__executor = this.executor

        this.executor = async (
            context: SlashCommandContext,
            read: IRead,
            modify: IModify,
            http: IHttp,
            persis: IPersistence,
            args?: Array<string>
        ): Promise<void> => {
            // object is saved on memory
            // if parent is null, i.e. it is the slashcommand
            // reregister the data
            if (this.parent == null) {
                this.__sender = context.getSender()
                this.__room = context.getRoom()
                this.__me = (await read.getUserReader().getAppUser()) as IUser
                this.__context = context
                this.__read = read
                this.__modify = modify
                this.__http = http
                this.__persis = persis
                this.__setting = new CKQSetting(this.app as App)
                this.__slash = this.__slash || {__: this}
                this.__slash.__ = this.__slash.__ || this

                args = context.getArguments()
            }

            await this.singLullaby(args as Array<string>)
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

    public async notifyUserOnSuccessSimple(user: IUser, text: string): Promise<void> {
        return await notifyUserOnSuccessSimple(
            {
                read: this.read,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    public async notifySenderOnSuccessSimple(text: string): Promise<void> {
        return await this.notifyUserOnSuccessSimple(this.sender, text)
    }

    public async notifyUserOnFailureSimple(user: IUser, text: string): Promise<void> {
        return await notifyUserOnFailureSimple(
            {
                read: this.read,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    public async notifySenderOnFailureSimple(text: string): Promise<void> {
        return await this.notifyUserOnFailureSimple(this.sender, text)
    }

    public async notifyUserSimple(user: IUser, text: string): Promise<void> {
        await notifyUserSimple(
            {
                read: this.read,
                modify: this.modify,
                user,
                room: this.room
            },
            text
        )
    }

    public async notifySenderSimple(text: string): Promise<void> {
        return await this.notifyUserSimple(this.sender, text)
    }

    public async notifyUser(
        user: IUser,
        message: Omit<IMessage, 'sender' | 'room'>
    ): Promise<void> {
        return await notifyUser(
            {
                read: this.read,
                modify: this.modify,
                user,
                room: this.room
            },
            message
        )
    }

    public async notifySender(message: Omit<IMessage, 'sender' | 'room'>): Promise<void> {
        return await this.notifyUser(this.sender, message)
    }

    public async sendDirectToUser(
        user: IUser,
        message: Omit<IMessage, 'sender' | 'room'>
    ): Promise<void> {
        return await sendDirectToUser(
            {
                read: this.read,
                modify: this.modify,
                user
            },
            message
        )
    }

    public async sendDirectToSender(message: Omit<IMessage, 'sender' | 'room'>): Promise<void> {
        return await this.sendDirectToUser(this.sender, message)
    }

    public async sendDirectToUserSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserSimple(
            {
                read: this.read,
                modify: this.modify,
                user
            },
            text
        )
    }

    public async sendDirectToSenderSimple(text: string): Promise<void> {
        return await this.sendDirectToUserSimple(this.sender, text)
    }

    public async sendDirectToUserOnSuccessSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserOnSuccessSimple(
            {
                read: this.read,
                modify: this.modify,
                user
            },
            text
        )
    }

    public async sendDirectToSenderOnSuccessSimple(text: string): Promise<void> {
        return await this.sendDirectToUserOnSuccessSimple(this.sender, text)
    }

    public async sendDirectToUserOnFailureSimple(user: IUser, text: string): Promise<void> {
        return await sendDirectToUserOnFailureSimple(
            {
                read: this.read,
                modify: this.modify,
                user
            },
            text
        )
    }

    public async sendDirectToSenderOnFailureSimple(text: string): Promise<void> {
        return await this.sendDirectToUserOnFailureSimple(this.sender, text)
    }

    public slashCommand(
        handler: Partial<Omit<ISlashCommand, 'command' | 'executor'> & {alias: string}>
    ): CKQommand {
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

    protected registerCommand(handler: CKQommand): void {
        handler.__parent = this

        this.__slash = handler.__slash = this.__slash || handler.__slash || {}

        this.commandMap.set(handler.command, handler)
    }

    private allowed(): boolean {
        return !this.hidden ? true : this.notafraud()
    }

    private *flyingChickens() {
        for (const command of this.commandMap) {
            if (command[1].allowed()) {
                yield command
            }
        }
    }

    private notafraud(): boolean {
        return this.sender.roles.some(
            (role: string): boolean => this.allowedRoles.indexOf(role) !== -1
        )
    }

    private async singLullaby(args: Array<string>): Promise<void> {
        if (!this.cryingChildren()) {
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

        const handler: CKQommand | undefined = this.gimmeSomeSugar(command)

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

    private gimmeSomeSugar(name: string): CKQommand | undefined {
        const handler: CKQommand | undefined = this.commandMap.get(name)

        if (handler?.allowed()) {
            return handler
        }
        return undefined
    }

    private cryingChildren(): boolean {
        return this.commandMap.size !== 0
    }

    private async mamaaa(args: Array<string>): Promise<void> {
        return this.sugar('help')
            ? /* papa help?*/
              await this.gimmeSomeSugar('help')?.executor(
                  this.context,
                  this.read,
                  this.modify,
                  this.http,
                  this.persis,
                  args
              )
            : /* papa no help */
              await this.notifySender({
                  text: `unknown command ${args.join(' ')}`
              })
    }

    private sugar(command: string): boolean {
        return this.commandMap.has(command)
    }
}

// tslint:disable-next-line: max-classes-per-file
class CKQHelp extends CKQommand {
    public command: string = 'help'

    // prettier-ignore
    public banner: (() => Promise<string>) | string
        = `${'-'.repeat(15)}\n|  *CKQ HELP!!*  |\n${'-'.repeat(15)}\n`

    constructor() {
        super()
    }

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
            text += `unknown command \`${args?.join(' ')}\` ...nothing to do...please run \`/${
                this.slash?.command
            } [command]...[subcommand] help\` for a list of available commands and their description.\n`
        }

        text += typeof this.banner === 'string' ? this.banner : await this.banner()
        text += `\`${this.parent?.command}\`: ${this.parent?.i18nDescription}\n`
        text += '`'.repeat(3).concat('\n')

        for (const [command, handler] of this.parent?.commands() || this.commands()) {
            text += `${' '.repeat(4)}${command}:\n${' '.repeat(8)}${handler.i18nDescription}\n`
        }

        text += '`'.repeat(3)
        await this.notifySenderSimple(text)
    }
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

type ICKQSettingValue = any

type ICKQSettingValueCorrectFunction = (
    v: ICKQSettingValue,
    accessors?: IAppAccessors
) => Promise<ICKQSettingValue>

type ICKQSettingValueFromFunction = (accessors?: IAppAccessors) => Promise<ICKQSettingValue>

type ICKQSetting = Optional<ISetting, 'packageValue'> & {
    correct?: ICKQSettingValueCorrectFunction
    from?: ICKQSettingValueFromFunction
}

// tslint:disable-next-line: max-classes-per-file
class CKQSetting {
    // tslint:disable: variable-name
    private readonly __app: App
    private readonly __accessors: IAppAccessors
    // tslint:enable: variable-name

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

    public async getSetting(ckqSetting: ICKQSetting): Promise<ISetting> {
        const {correct, from, ...setting} = ckqSetting

        const v = async (
            c: ICKQSettingValueCorrectFunction,
            f: ICKQSettingValueFromFunction,
            s: Optional<ISetting, 'packageValue'>
        ): Promise<{packageValue?: string; values?: Array<ISettingSelectValue>}> => {
            const st: string = s.type === SettingType.SELECT ? 'values' : 'packageValue'

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
        }
        return {
            ...setting,
            ...(await v(
                correct as ICKQSettingValueCorrectFunction,
                from as ICKQSettingValueFromFunction,
                setting
            ))
        } as ISetting
    }

    public async getValue(setting: ICKQSetting): Promise<ICKQSettingValue> {
        return setting.correct
            ? setting.correct(await this.environment.getSettings().getValueById(setting.id))
            : await this.environment.getSettings().getValueById(setting.id)
    }

    public async registerSettings(
        configuration: IConfigurationExtend,
        settings: Array<ICKQSetting>
    ): Promise<void> {
        await Promise.all(
            settings.map(
                async (setting: ICKQSetting) =>
                    await configuration.settings.provideSetting(await this.getSetting(setting))
            )
        )
    }
}

export {
    CKQommand,
    CKQHelp,
    ICKQSetting,
    ICKQSettingValue,
    ICKQSettingValueCorrectFunction,
    ICKQSettingValueFromFunction,
    CKQSetting
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
