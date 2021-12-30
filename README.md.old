# rocket.chat.apps.ckq

What is CKQ? CKQ is a small 'library' of sorts, intended to make CLI building easy in Rocket.Chat apps.

# How to use

-   create an app project using `rc-apps create`
-   create a directory in that project, `ckq`
-   download the class file in there, `(cd ckq; wget https://raw.githubusercontent.com/debdutdeb/rocket.chat.apps.ckq/main/CKQommand.ts)`

## Why?

In Rocket.Chat apps, there is a concept or feature called `slashcommand`s. A `slashcommand` is basically just a command, that you prepend with a slash.

The app is passed all the subsequent texts as arguments. For example if you enter `/cmd one two three`, the app will get its arguments as `['one', 'two', 'three']`.

By parsing these arguments, you can 'build' a command line interface, generally achieved via `switch` statements.

```ts
const [command, ..args]: Array<string> = context.getArguments()
switch (command) {...}
```

This becomes a problem when you intend to make a more complicated command system.

For a more 'advanced' or just complicated app, with multiple actions, features, triggerable without modals, it is ideal to group similar actions or characteristics under command groups as subcommands. Although `switch` does achieve how a command system should work, i.e. `[slashcommand] [command] [...args]`, if you wanted to make the system even more comprehensive with much more command **and** subcommand groups, well, things can get messy, non-scalable, not easily reproducible.

CKQ attempts to rectify that.

# Using CKQ

CKQ is basically two classes, `CKQommand` and `CKQHelp`. In CKQ, every word is a command, and there is no special concept of SlashCommand vs Command vs Subcommand, except for things outside of its scope (e.g. registering the slashcommand in the `App`).

For example, let's say you want to write an app that just greets its runner with a Hello. We can greet by real name, or we can greet by nickname. For real name, we can either use the first name, or the last name with a 'Mr/Ms/Mrs' to prepend.

So, for this app, the top command will have two subcommands, namely `realname` & `nickname`. For `realname`, we should have two more options, `firstname` & `lastname`.

Using CKQ, achieving this depth of command structure is extremely easy. As said, each keyword is a command, i.e. `hello` (the top command) is a command, `realname` is a command, `firstname` is a command, and so on.

> A command, is just an action with some surrounding artifacts to use and provide.

## Native system vs CKQ

Using the native system, you would implement the `ISlashCommand` interface in a class to create a slash command, and then use a bunch of `switch`, `if`s to execute the action method.

In CKQ, you just build each action item, i.e. the command, on its own. To build a command, keep in mind,

-   instead of implementing `ISlashCommand`, you extend `CKQommand`
-   each command looks similar to the native system's `SlashCommand`
-   to add a subcommand to a command, use the `registerCommand` method and pass the subcommand instance

And that's it. Let's see it in action.

### HelloCommand.ts

For the top command, write a class as follows,

```ts
export class HelloCommand extends CKQommand {
    public command: string = 'hello'
}
```

### NickNameCommand.ts

```ts
export class NickNameCommand extends CKQommand {
    public command: string = 'nickname'
}
```

### RealNameCommand.ts

```ts
export class RealNameCommand extends CKQommand {
    public command: string = 'realname'
}
```

### FirstNameCommand.ts

```ts
export class FirtNameCommand extends CKQommand {
    public command: string = 'firstname'
}
```

### LastNameCommand.ts

```ts
export class LastNameCommand extends CKQommand {
    public command: string = 'lastname'
}
```

## Connecting the commands/building the command chain

First, `hello` command has two subcommands, so we need to register those two (`nickname`, `realname`) in `hello`.

This is extremely easy to do, just use the `registerCommand` method that takes in a `CKQommand` object. Register it in the constructor.

```ts
export class HelloCommand extends CKQommand {
    public command: string = 'hello'

    constructor() {
        super()
        this.registerCommand(new NickNameCommand())
        this.registerCommand(new RealNameCommand())
    }
}
```

Now, `realname` has two more commands, the same flow, you need to register those two instances under the `realname` command or class.

```ts
export class RealNameCommand extends CKQommand {
    public command: string = 'realname'

    constructor() {
        super()
        this.registerCommand(new FirstNameCommand())
        this.registerCommand(new LastNameCommand())
    }
}
```

You CLI is mostly ready now! All you now need, is to define the actions, i.e. once those commands are hit, what should be done.

As said, each command in `CKQ` is of the same structure, more or less, and each fulfills the `ISlashCommand` promise, more or less.

Therefore, just like a slashcommand, in `CKQ`, the entrypoint, or command logic, sits in the `executor` method.

The executor method in `CKQ` is the same as `ISlashCommand`, except that in this version we have one more argument, an optional `args` that carries the arguments of that command's, and only that command's arguments.

If you look at the command structure definition, only `firstname` and `lastname` needs actions defined since any parent of that will just want to pass to a subcommand (more on this in a bit).

**What we want** is, when run `/hello realname firstname Jane Doe`, our app should send a message written `Hello Jane!`, and when run with `lastname`, i.e. `/hello realname last Jane Doe`, should send `Helo Mr/Ms/Mrs Doe!`.

### Defining actions

To define action, for each, you just need to implement the `ISlashCommand.executor` method.

```ts
public async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    http: IHttp,
    persis: IPersistence,
    args?: Array<string>
): Promise<void> {}
```

From these methods, we'll just send those messages, using one of `CKQ`'s provided helpers.

### Helpers

`CKQ` provides with simple helper methods, in this case, one of which we'll be using, `notifySenderSimple` method, that takes just a string argument. It will send a message to the command sender, one that only the sender can see.

To complete the `executor` methods,

**FirstNameCommand.ts**

```ts
public async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    http: IHttp,
    persis: IPersistence,
    args?: Array<string>
): Promise<void> {
    this.notifySenderSimple('Hello', args?.[0], '!')
}
```

**LastNameCommand.ts**

```ts
public async executor(
    context: SlashCommandContext,
    read: IRead,
    modify: IModify,
    http: IHttp,
    persis: IPersistence,
    args?: Array<string>
): Promise<void> {
    this.notifySenderSimple('Hello Mr/Ms/Mrs', args?.[1], '!')
}
```

### Completion

The CLI is done, now you just need to add the slash command to your `App` and deploy it.

# CKQ additional features

## Help command

In any CLIs, a `help` command is a must have. With `CKQ` it's extremely easy.

Just like any other command, register an instance of `CKQHelp` as a command, and your `help` command will be dynamically generated.

To make sure the help message is useful, make sure you define `i18nDescription` for each command.

If, an entered command is not found, `CKQ` will attempt to run its `help` command automatically with a message that command is not found. If no `help` found, it'll send a simple `command not found` message.

> By implementing an executor method in a command, you can evade this behavior.

There is a banner for the `help` command, by default looks like

```
---------------
| CKQ HELP!! |
---------------
```

You can change it, by extending the `CKQHelp` class. In that subclass, you need to override the value of the `banner` propery, which can either be just a string or an async arrow function.

## Object properties

`CKQ` makes a lot of app objects global properties. So you won't need to pass around same objects in between class methods all the time.

Currently available,

-   `this.app: App`
-   `this.parent: CKQommand` (parent command, `null` if slashcommand)
-   `this.sender: IUser` (user who executed the command)
-   `this.room: IRoom` (room where command was executed)
-   `this.me: IUser` (the app user)
-   `this.read: IRead`
-   `this.modify: IModify`
-   `this.context: SlashCommandContext`
-   `this.http: IHttp`
-   `this.persis: IPersistence`

## Helper methods

TODO: Some frequently used methods are to be implemented right into `CKQ`.

## Restricted commands

You can make commands restricted by marking them `hidden`. Set it to true and the commands willl only be visible by an admin user.

You can change the list of roles permitted by adding roles to `allowedRoles` array.

## Aliases

In a complicated CLI system, commands can get pretty long. Frequently used such commands can be a nuisance to repeatedly execute.

This is where aliases come in handy. You can turn any command into an alias by using the `slashCommand` method on the instance.

You can just reuse any `CKQ` instance for slashcommand, but, since slashcommands have additional features at the moment, the `slashCommand` method is there for you to add those in to your existing command.

By default this alias will just use its own 'command' name, but you can change that by passing an alias string to it, for example,

```ts
configuration.slashCommands.provideSlashcommand(
    new FirstNameCommand().slashCommand({alias: 'first'})
)
```

Now you will have a slashcommand named `first` that'll behave exactly the same as `hello realname firstname [...args]`.

Other options include,

-   `i18nDescription` (ideally should already be there)
-   `i18nParamsExample` (same as `ISlashCommand.i18nParamsExample`)
-   `providesPreview` (if you want to add previews, by default is set to `false`)
-   `previewer` (previewer method, see `ISlashCommand` please I have to go to bank in 10 minutes)
-   `executePreviewItem` (^^)

# How to pronounce CKQommand?

Idk, honestlty. I'm just calling it 'C'-'K'-'Q'-command. But I'd say just call is 'command'.

# What's CKQ an abbreviation of?

Nothing. I initially wanted to name it `Command`, but meh, then `Kommand`, too KDE-ish, then `Qommand`, found an existing twitter handle, so finally I just merged it all because I got tired. Thus `CKQommand`.

Did I mention you can use `HelpCommand` instead of `CKQHelp` if that's more readable and easy? Well I just did.

# Still Expreimental
