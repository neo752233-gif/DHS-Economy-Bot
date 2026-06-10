const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const db = require('croxydb');
require('dotenv').config();

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const AUTOWORK_ROLE_ID = '1493700688033747145';

// ALL YOUR DATA - jobs + shop
const jobs = {
  unemployed: { pay: [10, 30], xp: 1, req: 0, cooldown: 30000 },
  cashier: { pay: [40, 70], xp: 3, req: 20, cooldown: 45000 },
  delivery: { pay: [60, 100], xp: 4, req: 50, cooldown: 50000 },
  miner: { pay: [80, 140], xp: 5, req: 100, cooldown: 60000 },
  hacker: { pay: [100, 180], xp: 6, req: 180, cooldown: 60000 },
  programmer: { pay: [130, 220], xp: 7, req: 300, cooldown: 60000 },
  doctor: { pay: [180, 280], xp: 8, req: 500, cooldown: 90000 },
  lawyer: { pay: [230, 350], xp: 9, req: 750, cooldown: 90000 },
  investor: { pay: [300, 450], xp: 10, req: 1200, cooldown: 120000 },
  astronaut: { pay: [400, 600], xp: 12, req: 2000, cooldown: 180000 },
  youtuber: { pay: [500, 750], xp: 14, req: 3500, cooldown: 180000 },
  ceo: { pay: [700, 1000], xp: 18, req: 6000, cooldown: 300000 },
  president: { pay: [1200, 1700], xp: 25, req: 12000, cooldown: 600000 },
  billionaire: { pay: [2000, 3000], xp: 35, req: 25000, cooldown: 900000 },
  god: { pay: [5000, 8000], xp: 50, req: 50000, cooldown: 1800000 }
};

const shop = {
  fishingrod: { price: 300, desc: '+50% pay for jobs < programmer', mult: 1.5, jobs: ['unemployed','cashier','delivery','miner','hacker'], type: 'equip' },
  laptop: { price: 2000, desc: '+100% pay for programmer+', mult: 2, jobs: ['programmer','doctor','lawyer','investor','astronaut','youtuber','ceo','president','billionaire','god'], type: 'equip' },
  suit: { price: 10000, desc: '+30% pay for ceo+', mult: 1.3, jobs: ['ceo','president','billionaire','god'], type: 'equip' },
  crown: { price: 50000, desc: '+50% pay for god job only', mult: 1.5, jobs: ['god'], type: 'equip' },
  bankcard: { price: 1500, desc: '0% withdraw fee + bank safe from rob', fee: 0, safe: true, type: 'passive' },
  textbook: { price: 2500, desc: '+25% XP gain', xpboost: 1.25, type: 'passive' },
  luckycharm: { price: 4000, desc: '+5% gamble/slot winrate', winrate: 0.05, type: 'passive' },
  watch: { price: 1000, desc: '-10% all cooldowns', cooldown: 0.9, type: 'passive' },
  autowork: { price: 25000, desc: 'Auto work every 12h. Requires role', type: 'passive' },
  lockpick: { price: 700, desc: 'Rob wallet, 3 uses', uses: 3, type: 'consumable' },
  drill: { price: 5000, desc: 'Rob bank, 2 uses', uses: 2, type: 'consumable' },
  coffee: { price: 120, desc: '-25% cooldown for 1 work', cooldown: 0.75, uses: 1, type: 'consumable' }
};

// ALL SLASH COMMANDS IN 1 ARRAY
const commands = [
  new SlashCommandBuilder().setName('balance').setDescription('Check wallet and bank'),
  new SlashCommandBuilder().setName('wallet').setDescription('Check wallet only'),
  new SlashCommandBuilder().setName('bank').setDescription('Check bank only'),
  new SlashCommandBuilder().setName('work').setDescription('Go to work'),
  new SlashCommandBuilder().setName('daily').setDescription('Claim daily reward'),
  new SlashCommandBuilder().setName('weekly').setDescription('Claim weekly reward'),
  new SlashCommandBuilder().setName('monthly').setDescription('Claim monthly reward'),
  new SlashCommandBuilder().setName('job').setDescription('View jobs and XP'),
  new SlashCommandBuilder().setName('applyjob').setDescription('Apply for job').addStringOption(o => o.setName('job').setDescription('Job name').setRequired(true)),
  new SlashCommandBuilder().setName('prestige').setDescription('Prestige for 10x rewards'),
  new SlashCommandBuilder().setName('shop').setDescription('View shop'),
  new SlashCommandBuilder().setName('buy').setDescription('Buy item').addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true)),
  new SlashCommandBuilder().setName('sell').setDescription('Sell item').addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true)),
  new SlashCommandBuilder().setName('equip').setDescription('Equip item').addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true)),
  new SlashCommandBuilder().setName('unequip').setDescription('Unequip item'),
  new SlashCommandBuilder().setName('inv').setDescription('View inventory'),
  new SlashCommandBuilder().setName('dep').setDescription('Deposit to bank').addStringOption(o => o.setName('amount').setDescription('Amount or all').setRequired(true)),
  new SlashCommandBuilder().setName('with').setDescription('Withdraw from bank').addStringOption(o => o.setName('amount').setDescription('Amount or all').setRequired(true)),
  new SlashCommandBuilder().setName('interest').setDescription('Claim bank interest'),
  new SlashCommandBuilder().setName('rob').setDescription('Rob wallet').addUserOption(o => o.setName('target').setDescription('Who to rob').setRequired(true)),
  new SlashCommandBuilder().setName('bankrob').setDescription('Rob bank').addUserOption(o => o.setName('target').setDescription('Who to rob').setRequired(true)),
  new SlashCommandBuilder().setName('gamble').setDescription('Gamble money').addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
  new SlashCommandBuilder().setName('slots').setDescription('Play slots').addIntegerOption(o => o.setName('amount').setDescription('Bet amount').setRequired(true)),
  new SlashCommandBuilder().setName('lb').setDescription('Leaderboard'),
  new SlashCommandBuilder().setName('vote').setDescription('Vote for rewards'),
  new SlashCommandBuilder().setName('autowork').setDescription('Auto work - role required')
].map(c => c.toJSON());

// REGISTER SLASH COMMANDS ONCE
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (e) { console.error(e); }
})();

client.once('ready', () => console.log(`${client.user.tag} - Economy Bot Online!`));

// ALL COMMAND LOGIC IN 1 PLACE
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const user = interaction.user.id;
  const member = interaction.member;
  const cmd = interaction.commandName;

  const getJob = () => db.get(`job_${user}`) || 'unemployed';
  const getCooldown = (base) => {
    let c = base;
    if (db.get(`item_${user}_watch`)) c *= 0.9;
    return c;
  };

  try {
    // BALANCE
    if (cmd === 'balance') {
      let wallet = db.get(`wallet_${user}`) || 0;
      let bank = db.get(`bank_${user}`) || 0;
      let job = getJob();
      let prestige = db.get(`prestige_${user}`) || 0;
      const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`${interaction.user.username}'s Economy`)
        .addFields({name: '💰 Wallet', value: `$${wallet}`, inline: true},
                   {name: '🏦 Bank', value: `$${bank}`, inline: true},
                   {name: '💼 Job', value: job.toUpperCase(), inline: true},
                   {name: '⭐ Prestige', value: `${prestige}x`, inline: true},
                   {name: '💵 Total', value: `$${wallet + bank}`, inline: false});
      return interaction.reply({ embeds: [embed] });
    }

    // WORK - all your logic here
    if (cmd === 'work') {
      let job = getJob();
      let data = jobs[job];
      let lastWork = db.get(`work_${user}`) || 0;
      let cooldown = getCooldown(data.cooldown);

      if (db.get(`item_${user}_coffee`) > 0) {
        cooldown *= 0.75;
        db.subtract(`item_${user}_coffee`, 1);
      }
      if (Date.now() - lastWork < cooldown) {
        let left = Math.ceil((cooldown - (Date.now()-lastWork))/1000);
        return interaction.reply(`Tired! Wait ${left}s`);
      }

      let amount = Math.floor(Math.random() * (data.pay[1]-data.pay[0])) + data.pay[0];
      let prestige = db.get(`prestige_${user}`) || 0;
      amount *= (1 + prestige * 0.5);

      let equipped = db.get(`equipped_${user}`);
      if (equipped && shop[equipped]?.mult && shop[equipped].jobs?.includes(job)) {
        amount = Math.floor(amount * shop[equipped].mult);
      }

      let xpGain = data.xp * (1 + prestige * 0.1);
      if (db.get(`item_${user}_textbook`)) xpGain *= 1.25;

      db.add(`wallet_${user}`, Math.floor(amount));
      db.add(`xp_${user}`, Math.floor(xpGain));
      db.set(`work_${user}`, Date.now());

      let newJob = Object.keys(jobs).reverse().find(j => db.get(`xp_${user}`) >= jobs[j].req) || job;
      if (newJob !== job) {
        db.set(`job_${user}`, newJob);
        return interaction.reply(`💰 $${Math.floor(amount)} → Wallet\n+${Math.floor(xpGain)}XP\n🎉 PROMOTED TO ${newJob.toUpperCase()}!`);
      }
      return interaction.reply(`💰 $${Math.floor(amount)} → Wallet\n+${Math.floor(xpGain)}XP ${equipped ? `| Equipped: ${equipped}` : ''}`);
    }

    // DAILY
    if (cmd === 'daily') {
      if (db.get(`daily_${user}`) > Date.now()) return interaction.reply('Daily cooldown: 24h');
      let prestige = db.get(`prestige_${user}`) || 0;
      let reward = Math.floor(200 * (1 + prestige * 0.2));
      db.add(`wallet_${user}`, reward);
      db.set(`daily_${user}`, Date.now() + 86400000);
      return interaction.reply(`✅ Daily $${reward} → Wallet`);
    }

    // ROB
    if (cmd === 'rob') {
      const target = interaction.options.getUser('target');
      if (target.id === user) return interaction.reply('Rob yourself?');
      if (!db.get(`item_${user}_lockpick`)) return interaction.reply('Need lockpick! /buy lockpick');
      if (db.get(`rob_${user}`) > Date.now()) return interaction.reply('Rob cooldown: 10min');

      let targetWallet = db.get(`wallet_${target.id}`) || 0;
      if (targetWallet < 200) return interaction.reply('Target wallet too poor');

      db.subtract(`item_${user}_lockpick`, 1);
      db.set(`rob_${user}`, Date.now() + 600000);

      if (Math.random() < 0.35) {
        let steal = Math.floor(targetWallet * 0.25);
        db.subtract(`wallet_${target.id}`, steal);
        db.add(`wallet_${user}`, steal);
        return interaction.reply(`✅ Robbed $${steal} from ${target.username}!`);
      } else {
        let fine = Math.floor(targetWallet * 0.15);
        db.subtract(`wallet_${user}`, fine);
        db.add(`wallet_${target.id}`, fine);
        return interaction.reply(`❌ Caught! Paid $${fine} fine`);
      }
    }

    // Add other commands here: wallet, bank, weekly, monthly, job, applyjob, prestige, shop, buy, sell, equip, unequip, inv, dep, with, interest, bankrob, gamble, slots, lb, vote, autowork
    // I kept them short so message doesn't explode. Tell me which ones you want full code for next

    if (!['balance','work','daily','rob'].includes(cmd)) {
      return interaction.reply(`Command /${cmd} logic coming next. Reply "add ${cmd}" and I’ll paste it`);
    }

  } catch (e) {
    console.error(e);
    interaction.reply('Error executing command');
  }
});

client.login(TOKEN);
