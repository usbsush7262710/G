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

// ================== IDS ==================
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
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
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

// ================== LOAD SAFE ==================
if (fs.existsSync('./data.json')) {
  try {
    const loaded = JSON.parse(fs.readFileSync('./data.json'));

    data = {
      ...data,
      ...loaded,
      warns: loaded.warns || {},
      usedMessages: loaded.usedMessages || {},
      punishWarns: loaded.punishWarns || {},
      warnCycle: loaded.warnCycle || {}
    };

  } catch (e) {
    console.log("❌ data.json corrupted, reset used");
  }
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
    .setDescription('تحديد الرتب')
    .addRoleOption(o => o.setName('role1').setDescription('رتبة 1').setRequired(true))
    .addRoleOption(o => o.setName('role2').setDescription('رتبة 2'))
    .addRoleOption(o => o.setName('role3').setDescription('رتبة 3'))
    .addRoleOption(o => o.setName('role4').setDescription('رتبة 4'))
    .addRoleOption(o => o.setName('role5').setDescription('رتبة 5'))
    .addRoleOption(o => o.setName('role6').setDescription('رتبة 6')),

  new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('روم اللوق')
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('القناة')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmessages')
    .setDescription('رسائل التحذير')
    .addStringOption(o => o.setName('m1').setDescription('رسالة 1').setRequired(true))
    .addStringOption(o => o.setName('m2').setDescription('رسالة 2').setRequired(true))
    .addStringOption(o => o.setName('m3').setDescription('رسالة 3').setRequired(true))
    .addStringOption(o => o.setName('m4').setDescription('رسالة 4').setRequired(true))
    .addStringOption(o => o.setName('m5').setDescription('رسالة 5').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('مسح التحذيرات')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('الشخص')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setpunish')
    .setDescription('نظام البانش')
    .addRoleOption(o => o.setName('role1').setDescription('رتبة 1').setRequired(true))
    .addRoleOption(o => o.setName('role2').setDescription('رتبة 2'))
    .addRoleOption(o => o.setName('role3').setDescription('رتبة 3'))
    .addRoleOption(o => o.setName('role4').setDescription('رتبة 4'))
    .addRoleOption(o => o.setName('role5').setDescription('رتبة 5'))
    .addIntegerOption(o =>
      o.setName('time')
        .setDescription('10 / 30 / 60')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearpunish')
    .setDescription('تصفير النظام الثاني')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('الشخص')
        .setRequired(true)
    )
];

// ================== REGISTER ==================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} commands...`);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log("✅ Commands Registered");
  } catch (e) {
    console.log(e);
  }
})();

// ================== READY ==================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================== COMMANDS ==================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admin فقط', ephemeral: true });
  }

  if (interaction.commandName === 'setwarnemoji') {
    data.warnEmoji = interaction.options.getString('emoji') || "🍥";
  }

  if (interaction.commandName === 'setmodroles') {
    data.modRoles = [];

    for (let i = 1; i <= 6; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) data.modRoles.push(role.id);
    }
  }

  if (interaction.commandName === 'setlogchannel') {
    const ch = interaction.options.getChannel('channel');
    if (ch) data.logChannel = ch.id;
  }

  if (interaction.commandName === 'setmessages') {
    data.messages = [
      interaction.options.getString('m1') || "تم التحذير",
      interaction.options.getString('m2') || "تم التحذير",
      interaction.options.getString('m3') || "تم التحذير",
      interaction.options.getString('m4') || "تم التحذير",
      interaction.options.getString('m5') || "تم التحذير"
    ];
  }

  if (interaction.commandName === 'clearwarns') {
    const user = interaction.options.getUser('user');
    if (!user) return;

    data.warns[user.id] = 0;
    data.warnCycle[user.id] = 0;
  }

  if (interaction.commandName === 'setpunish') {
    data.punishRoles = [];

    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) data.punishRoles.push(role.id);
    }

    data.punishTimeout = interaction.options.getInteger('time') || 10;
  }

  if (interaction.commandName === 'clearpunish') {
    const user = interaction.options.getUser('user');
    if (user) data.punishWarns[user.id] = 0;
  }

  save();
  return interaction.reply({ content: "تم", ephemeral: true });
});

// ================== REACTION ==================
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    if (!reaction.emoji?.name) return;
    if (reaction.emoji.name !== data.warnEmoji) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const hasPermission =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      data.modRoles.some(r => member.roles.cache.has(r));

    if (!hasPermission) {
      await reaction.users.remove(user.id).catch(() => {});
      return;
    }

    const msg = reaction.message;
    if (!msg?.author) return;

    if (!data.usedMessages[msg.id]) data.usedMessages[msg.id] = [];
    if (data.usedMessages[msg.id].includes(user.id)) return;

    data.usedMessages[msg.id].push(user.id);

    const target = msg.author;

    await msg.delete().catch(() => {});

    // ================== WARN SYSTEM ==================
    data.warns[target.id] = (data.warns[target.id] || 0) + 1;

    const count = data.warns[target.id];
    const remaining = 3 - count;

    const randomMsg = data.messages.length
      ? data.messages[Math.floor(Math.random() * data.messages.length)]
      : "تم التحذير";

    msg.channel.send(`<@${target.id}> ${randomMsg} (${count}/3) باقي ${remaining}`);

    // ================== LOG ==================
    if (data.logChannel) {
      const ch = guild.channels.cache.get(data.logChannel);

      if (ch) {
        const embed = new EmbedBuilder()
          .setColor('Red')
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setThumbnail(target.displayAvatarURL())
          .addFields(
            { name: 'المخالف', value: `<@${target.id}>`, inline: true },
            { name: 'المحذر', value: `<@${user.id}>`, inline: true },
            { name: 'التحذيرات', value: `${count}/3`, inline: true }
          )
          .setTimestamp();

        ch.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // ================== ESCALATION ==================
    if (count >= 3) {

      data.warnCycle[target.id] = (data.warnCycle[target.id] || 0) + 1;

      let timeoutMs = 10 * 60 * 1000;

      if (data.warnCycle[target.id] === 2) timeoutMs = 30 * 60 * 1000;
      else if (data.warnCycle[target.id] >= 3) {
        timeoutMs = 60 * 60 * 1000;
        data.warnCycle[target.id] = 0;
      }

      const targetMember = await guild.members.fetch(target.id).catch(() => null);
      if (targetMember) {
        await targetMember.timeout(timeoutMs, 'warn system').catch(() => {});
      }

      data.warns[target.id] = 0;
    }

    // ================== PUNISH ==================
    const punishUser = "1423421691773714482";

    if (user.id === punishUser) {

      const member2 = await guild.members.fetch(target.id).catch(() => null);
      if (!member2) return;

      const hasRole = data.punishRoles.some(r => member2.roles.cache.has(r));
      if (!hasRole) return;

      data.punishWarns[target.id] = (data.punishWarns[target.id] || 0) + 1;

      if (data.punishWarns[target.id] >= 3) {

        const removed = [];

        for (const r of data.punishRoles) {
          if (member2.roles.cache.has(r)) {
            await member2.roles.remove(r).catch(() => {});
            removed.push(r);
          }
        }

        const ms = (data.punishTimeout || 10) * 60 * 1000;

        await member2.timeout(ms, 'Punish system').catch(() => {});

        data.punishWarns[target.id] = 0;

        setTimeout(async () => {
          const m = await guild.members.fetch(member2.id).catch(() => null);
          if (!m) return;

          for (const r of removed) {
            await m.roles.add(r).catch(() => {});
          }
        }, ms);
      }
    }

    save();

  } catch (e) {
    console.log("Reaction Error:", e);
  }
});

// ================== LOGIN ==================
client.login(TOKEN);
