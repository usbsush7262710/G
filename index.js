const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// ================== FIXED IDS ==================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1496857562031722506";
const GUILD_ID = "1497416874173141135";

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================== DATABASE ==================
let data = {
  warnEmoji: "🍥",
  modRoles: [],
  logChannel: null,
  messages: [],
  warns: {},
  usedMessages: {},

  punishRoles: [],
  punishWarns: {},
  punishTimeout: 10,

  warnCycle: {}
};

if (fs.existsSync('./data.json')) {
  data = JSON.parse(fs.readFileSync('./data.json'));
}

function save() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// ================== SLASH COMMANDS ==================
const commands = [

  new SlashCommandBuilder()
    .setName('setwarnemoji')
    .setDescription('تحديد ايموجي التحذير')
    .addStringOption(o =>
      o.setName('emoji')
        .setDescription('الايموجي')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmodroles')
    .setDescription('تحديد 6 رتب')
    .addRoleOption(o => o.setName('role1').setDescription('رتبة 1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addRoleOption(o => o.setName('role6')),

  new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('تحديد روم اللوق')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('روم اللوق')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmessages')
    .setDescription('تحديد 5 رسائل')
    .addStringOption(o => o.setName('m1').setRequired(true))
    .addStringOption(o => o.setName('m2').setRequired(true))
    .addStringOption(o => o.setName('m3').setRequired(true))
    .addStringOption(o => o.setName('m4').setRequired(true))
    .addStringOption(o => o.setName('m5').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('حذف تحذيرات شخص')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('الشخص')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setpunish')
    .setDescription('نظام التحذير الثاني')
    .addRoleOption(o => o.setName('role1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addIntegerOption(o =>
      o.setName('time')
        .setDescription('10 / 30 / 60 دقائق')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearpunish')
    .setDescription('تصفير تحذيرات النظام الثاني')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('الشخص')
        .setRequired(true)
    )
];

// ================== REGISTER COMMANDS (FORCE REFRESH) ==================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("🧹 Clearing old commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );

    console.log("⚡ Registering new commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log(`✅ ${commands.length} Commands Registered`);
  } catch (e) {
    console.log(e);
  }
})();

// ================== COMMAND HANDLER ==================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admin فقط', ephemeral: true });
  }

  if (interaction.commandName === 'setwarnemoji') {
    data.warnEmoji = interaction.options.getString('emoji');
    save();
    return interaction.reply('تم');
  }

  if (interaction.commandName === 'setmodroles') {
    data.modRoles = [];
    for (let i = 1; i <= 6; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) data.modRoles.push(role.id);
    }
    save();
    return interaction.reply('تم حفظ الرتب');
  }

  if (interaction.commandName === 'setlogchannel') {
    data.logChannel = interaction.options.getChannel('channel').id;
    save();
    return interaction.reply('تم');
  }

  if (interaction.commandName === 'setmessages') {
    data.messages = [
      interaction.options.getString('m1'),
      interaction.options.getString('m2'),
      interaction.options.getString('m3'),
      interaction.options.getString('m4'),
      interaction.options.getString('m5')
    ];
    save();
    return interaction.reply('تم حفظ الرسائل');
  }

  if (interaction.commandName === 'clearwarns') {
    const user = interaction.options.getUser('user');
    data.warns[user.id] = 0;
    data.warnCycle[user.id] = 0;
    save();
    return interaction.reply(`تم تصفير تحذيرات ${user}`);
  }

  if (interaction.commandName === 'setpunish') {
    data.punishRoles = [];

    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) data.punishRoles.push(role.id);
    }

    data.punishTimeout = interaction.options.getInteger('time');
    save();
    return interaction.reply('تم إعداد النظام الثاني');
  }

  if (interaction.commandName === 'clearpunish') {
    const user = interaction.options.getUser('user');
    data.punishWarns[user.id] = 0;
    save();
    return interaction.reply(`تم تصفير تحذيرات النظام الثاني لـ ${user}`);
  }
});

// ================== REACTION SYSTEM ==================
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (reaction.emoji.name !== data.warnEmoji) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    const hasPermission =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      data.modRoles.some(r => member.roles.cache.has(r));

    if (!hasPermission) {
      await reaction.users.remove(user.id);
      return;
    }

    const msg = reaction.message;

    if (!data.usedMessages[msg.id]) data.usedMessages[msg.id] = [];
    if (data.usedMessages[msg.id].includes(user.id)) return;

    data.usedMessages[msg.id].push(user.id);

    const target = msg.author;
    const deletedContent = msg.content;

    await msg.delete();

    // NORMAL SYSTEM
    if (!data.warns[target.id]) data.warns[target.id] = 0;
    if (!data.warnCycle[target.id]) data.warnCycle[target.id] = 0;

    data.warns[target.id]++;

    const count = data.warns[target.id];

    const randomMsg = data.messages[Math.floor(Math.random() * data.messages.length)];
    msg.channel.send(`<@${target.id}> ${randomMsg} (${count}/3)`);

    // ESCALATION
    if (count >= 3) {
      data.warnCycle[target.id]++;

      let timeoutMs =
        data.warnCycle[target.id] === 1 ? 10 * 60 * 1000 :
        data.warnCycle[target.id] === 2 ? 30 * 60 * 1000 :
        (data.warnCycle[target.id] = 0, 60 * 60 * 1000);

      const targetMember = await guild.members.fetch(target.id);
      await targetMember.timeout(timeoutMs, 'warn cycle');

      data.warns[target.id] = 0;
    }

    // PUNISH SYSTEM
    const punishUser = "1423421691773714482";

    if (user.id === punishUser) {
      const member2 = await guild.members.fetch(target.id);

      const hasRole = data.punishRoles.some(r =>
        member2.roles.cache.has(r)
      );

      if (!hasRole) return;

      if (!data.punishWarns[member2.id]) data.punishWarns[member2.id] = 0;
      data.punishWarns[member2.id]++;

      if (data.punishWarns[member2.id] >= 3) {

        const removed = [];

        for (const r of data.punishRoles) {
          if (member2.roles.cache.has(r)) {
            await member2.roles.remove(r);
            removed.push(r);
          }
        }

        const ms = data.punishTimeout * 60 * 1000;

        await member2.timeout(ms, 'Punish system');

        data.punishWarns[member2.id] = 0;

        setTimeout(async () => {
          try {
            const m = await guild.members.fetch(member2.id);
            for (const r of removed) {
              await m.roles.add(r);
            }
          } catch {}
        }, ms);
      }
    }

    save();

  } catch (e) {
    console.log(e);
  }
});

client.login(TOKEN);
