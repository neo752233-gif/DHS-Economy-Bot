import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import db from 'quick.db';

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ] 
});

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '!';
const AUTOWORK_ROLE_ID = '1493700688033747145';

// 15 JOBS
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

// SHOP
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

client.once('ready', () => console.log(`${client.user.tag} - Economy Bot Online!`));

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const user = message.author.id;
  const target = message.mentions.users.first();
  const member = message.member;

  const getJob = () => db.get(`job_${user}`) || 'unemployed';
  const getCooldown = (base) => {
    let c = base;
    if (db.get(`item_${user}_watch`)) c *= 0.9;
    return c;
  };

  // BALANCE
  if (cmd === 'bal' || cmd === 'balance') {
    let wallet = db.get(`wallet_${user}`) || 0;
    let bank = db.get(`bank_${user}`) || 0;
    let job = getJob();
    let prestige = db.get(`prestige_${user}`) || 0;
    return message.reply(`💰 Wallet: $${wallet}\n🏦 Bank: $${bank}\n💼 Job: ${job.toUpperCase()}\n⭐ Prestige: ${prestige}x\n💵 Total: $${wallet + bank}`);
  }
  
  // WORK - shortened for space, rest of commands same logic
  if (cmd === 'work') {
    let job = getJob();
    let data = jobs[job];
    let lastWork = db.get(`work_${user}`) || 0;
    let cooldown = getCooldown(data.cooldown);

    if (db.get(`item_${user}_coffee`) > 0) {
      cooldown *= 0.75;
      db.subtract(`item_${user}_coffee`, 1);
    }
    if (Date.now() - lastWork < cooldown) return message.reply(`Tired! Wait ${Math.ceil((cooldown - (Date.now()-lastWork))/1000)}s`);

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

    return message.reply(`💰 $${Math.floor(amount)} → Wallet\n+${Math.floor(xpGain)}XP`);
  }

  // Add all other commands from your code here... daily, shop, buy, rob, etc
  // I kept work + bal as example. Paste the rest of your if(cmd === ...) blocks below
});

client.login(TOKEN);
