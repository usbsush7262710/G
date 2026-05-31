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
const TOKEN = process.env.TOKEN || "PUT_TOKEN";
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
    .setDescription('ايموجي التحذير')
    .addStringOption(o =>
      o.setName('emoji').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmodroles')
    .setDescription('رتب المود')
    .addRoleOption(o => o.setName('role1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addRoleOption(o => o.setName('role6')),

  new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('روم اللوق')
    .addChannelOption(o =>
      o.setName('channel').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setmessages')
    .setDescription('رسائل التحذير')
    .addStringOption(o => o.setName('m1').setRequired(true))
    .addStringOption(o => o.setName('m2').setRequired(true))
    .addStringOption(o => o.setName('m3').setRequired(true))
    .addStringOption(o => o.setName('m4').setRequired(true))
    .addStringOption(o => o.setName('m5').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('تصفير التحذيرات')
    .addUserOption(o =>
      o.setName('user').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setpunish')
    .setDescription('نظام الرتب')
    .addRoleOption(o => o.setName('role1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addIntegerOption(o =>
      o.setName('time').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('clearpunish')
    .setDescription('تصفير punish')
    .addUserOption(o =>
      o.setName('user').setRequired(true)
    )
];

// ================== REGISTER SYSTEM ==================
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log("🧹 Reset commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: [] }
    );

    const body = commands.map(c => c.toJSON());

    console.log("⚡ Registering:", body.length);

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body }
    );

    console.log("✅ Slash commands loaded");
  } catch (err) {
    console.log("CMD ERROR:", err);
  }
}

// ================== READY ==================
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
});

// ================== COMMANDS ==================
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
      const r = interaction.options.getRole(`role${i}`);
      if (r) data.modRoles.push(r.id);
    }
    save();
    return interaction.reply('تم');
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
    return interaction.reply('تم');
  }

  if (interaction.commandName === 'clearwarns') {
    const u = interaction.options.getUser('user');
    data.warns[u.id] = 0;
    data.warnCycle[u.id] = 0;
    save();
    return interaction.reply('تم التصفير');
  }

  if (interaction.commandName === 'setpunish') {
    data.punishRoles = [];
    for (let i = 1; i <= 5; i++) {
      const r = interaction.options.getRole(`role${i}`);
      if (r) data.punishRoles.push(r.id);
    }
    data.punishTimeout = interaction.options.getInteger('time');
    save();
    return interaction.reply('تم النظام');
  }

  if (interaction.commandName === 'clearpunish') {
    const u = interaction.options.getUser('user');
    data.punishWarns[u.id] = 0;
    save();
    return interaction.reply('تم تصفير punish');
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

    const allowed =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      data.modRoles.some(r => member.roles.cache.has(r));

    if (!allowed) {
      await reaction.users.remove(user.id);
      return;
    }

    const msg = reaction.message;
    const target = msg.author;

    if (!data.warns[target.id]) data.warns[target.id] = 0;
    if (!data.warnCycle[target.id]) data.warnCycle[target.id] = 0;

    await msg.delete();

    data.warns[target.id]++;

    const count = data.warns[target.id];

    msg.channel.send(`<@${target.id}> (${count}/3)`);

    // ESCALATION
    if (count >= 3) {
      data.warnCycle[target.id]++;

      let time =
        data.warnCycle[target.id] === 1 ? 10 :
        data.warnCycle[target.id] === 2 ? 30 :
        (data.warnCycle[target.id] = 0, 60);

      const member2 = await guild.members.fetch(target.id);

      await member2.timeout(time * 60000, 'warn system');

      data.warns[target.id] = 0;
    }

    // PUNISH
    const punishUser = "1423421691773714482";

    if (user.id === punishUser) {
      const m2 = await guild.members.fetch(target.id);

      if (!data.punishRoles.some(r => m2.roles.cache.has(r))) return;

      if (!data.punishWarns[m2.id]) data.punishWarns[m2.id] = 0;

      data.punishWarns[m2.id]++;

      if (data.punishWarns[m2.id] >= 3) {
        const removed = [];

        for (const r of data.punishRoles) {
          if (m2.roles.cache.has(r)) {
            await m2.roles.remove(r);
            removed.push(r);
          }
        }

        const ms = data.punishTimeout * 60000;

        await m2.timeout(ms, 'punish');

        data.punishWarns[m2.id] = 0;

        setTimeout(async () => {
          const mm = await guild.members.fetch(m2.id);
          for (const r of removed) {
            await mm.roles.add(r);
          }
        }, ms);
      }
    }

    save();

  } catch (e) {
    console.log(e);
  }
});

client.login(TOKEN);
