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

// ================== IDs ==================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================== CLIENT ==================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================== DATA ==================
let data = {
  warnEmoji: "🍥",
  modRoles: [],
  logChannel: null,
  messages: [],
  warns: {},
  usedMessages: {},
  warnCycle: {},
  punishRoles: [],
  punishWarns: {},
  punishTimeout: 10
};

if (fs.existsSync('./data.json')) {
  try {
    data = JSON.parse(fs.readFileSync('./data.json'));
  } catch {}
}

function save() {
  fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
}

// ================== SLASH COMMANDS ==================
const commands = [
  new SlashCommandBuilder()
    .setName('setwarnemoji')
    .setDescription('تحديد ايموجي التحذير')
    .addStringOption(o => o.setName('emoji').setRequired(true)),

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
    .addChannelOption(o => o.setName('channel').setRequired(true)),

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
    .setDescription('مسح التحذيرات')
    .addUserOption(o => o.setName('user').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setpunish')
    .setDescription('نظام البانش')
    .addRoleOption(o => o.setName('role1').setRequired(true))
    .addRoleOption(o => o.setName('role2'))
    .addRoleOption(o => o.setName('role3'))
    .addRoleOption(o => o.setName('role4'))
    .addRoleOption(o => o.setName('role5'))
    .addIntegerOption(o => o.setName('time').setRequired(true))
];

// ================== REGISTER (FIXED) ==================
async function register() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  console.log("🔄 Syncing slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands.map(c => c.toJSON()) }
  );

  console.log("✅ Slash commands synced");
}

// ================== READY ==================
client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await register();
});

// ================== INTERACTIONS ==================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "Admin فقط", ephemeral: true });
  }

  if (interaction.commandName === 'setwarnemoji') {
    data.warnEmoji = interaction.options.getString('emoji');
  }

  if (interaction.commandName === 'setmodroles') {
    data.modRoles = [];
    for (let i = 1; i <= 6; i++) {
      const r = interaction.options.getRole(`role${i}`);
      if (r) data.modRoles.push(r.id);
    }
  }

  if (interaction.commandName === 'setlogchannel') {
    data.logChannel = interaction.options.getChannel('channel').id;
  }

  if (interaction.commandName === 'setmessages') {
    data.messages = [
      interaction.options.getString('m1'),
      interaction.options.getString('m2'),
      interaction.options.getString('m3'),
      interaction.options.getString('m4'),
      interaction.options.getString('m5')
    ];
  }

  if (interaction.commandName === 'clearwarns') {
    const u = interaction.options.getUser('user');
    data.warns[u.id] = 0;
    data.warnCycle[u.id] = 0;
  }

  if (interaction.commandName === 'setpunish') {
    data.punishRoles = [];
    for (let i = 1; i <= 5; i++) {
      const r = interaction.options.getRole(`role${i}`);
      if (r) data.punishRoles.push(r.id);
    }
    data.punishTimeout = interaction.options.getInteger('time');
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

    if (reaction.emoji.name !== data.warnEmoji) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return reaction.users.remove(user.id);
    }

    const msg = reaction.message;
    const target = msg.author;

    await msg.delete();

    if (!data.warns[target.id]) data.warns[target.id] = 0;
    if (!data.warnCycle[target.id]) data.warnCycle[target.id] = 0;

    data.warns[target.id]++;

    if (data.warns[target.id] >= 3) {
      data.warnCycle[target.id]++;

      let time = 10;
      if (data.warnCycle[target.id] === 2) time = 30;
      else if (data.warnCycle[target.id] >= 3) time = 60;

      const ms = time * 60 * 1000;

      const m = await guild.members.fetch(target.id);
      await m.timeout(ms);

      data.warns[target.id] = 0;
    }

    save();
  } catch (e) {
    console.log(e);
  }
});

// ================== LOGIN ==================
client.login(TOKEN);
