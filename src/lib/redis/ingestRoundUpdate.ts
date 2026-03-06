import { EmbedBuilder, TextChannel, formatEmoji, roleMention } from 'discord.js';
import { container } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { fetchOrCreateHook } from '../discord/webhook';

export const ingestRoundUpdate = async (message: string, channel: string) => {
	if (!process.env.CM13_BOT_DISCORD_GUILD_MOD_CHANNEL || !process.env.CM13_BOT_GAME_MAIN_INSTANCE || !message || !channel) return;

	const { client } = container;
	const data = JSON.parse(message);

	if (data['source'] === process.env.CM13_BOT_GAME_MAIN_INSTANCE) {
		if (data['type'] === 'round-complete') {
			if (data.round_id) newThread(data.round_id, data.round_name)
			else newThread(data.round_id)
		}

		if (data.type == "predator-round") {
			await handlePredatorRound(data.round_id, data.map)
		}
	}

	const channel_msay = client.channels.cache.get(process.env.CM13_BOT_DISCORD_GUILD_MOD_CHANNEL);
	if (!channel_msay || !(channel_msay instanceof TextChannel)) return;

	if (process.env.CM13_BOT_DISCORD_EMOJI_BLUE) {
		channel_msay.send(
			`${formatEmoji(process.env.CM13_BOT_DISCORD_EMOJI_BLUE)} \`Round Update\`@\`${data.source}\`: ${data.type === 'round-complete' ? 'Round Completed' : 'Round Started'
			}`
		);
		return;
	}

	const newEmbed = new EmbedBuilder();
	newEmbed.setDescription(data['type'] === 'round-complete' ? 'Round Completed' : 'Round Started');
	newEmbed.setTitle('Game Update');
	newEmbed.setColor('Blue');
	newEmbed.setFooter({ text: `@${data['source']}` });
	newEmbed.setTimestamp();

	channel_msay.send({ embeds: [newEmbed] });
};

const newThread = async (round_id: string, round_name?: string) => {
	const { client } = container;

	const lastRoundChat = client.channels.cache.get(process.env.CM13_BOT_DISCORD_GUILD_TALK_CHANNEL);
	if (!(lastRoundChat instanceof TextChannel)) return;

	const newEmbed = new EmbedBuilder();
	newEmbed.setDescription(`Round ${round_id} completed!`);
	newEmbed.setTitle('Round Completed');
	newEmbed.setTimestamp();
	newEmbed.setColor('Green');

	const webhook = await fetchOrCreateHook(lastRoundChat)

	const message = await webhook.send({
		embeds: [newEmbed],
		username: process.env.CM13_BOT_DISCORD_WEBHOOK_NAME,
		avatarURL: process.env.CM13_BOT_DISCORD_WEBHOOK_PROFILE_PICTURE
	});

	const threadName = round_name ? `${round_id} - ${round_name}` : round_id
	message.startThread({
		name: `${threadName}`,
		autoArchiveDuration: 60,
		reason: `${round_id} completed.`
	})

	const threads = await lastRoundChat.threads.fetchActive()

	const fiveHourAgo = Date.now() - (Time.Hour * 5)
	for (const thread in threads.threads) {
		const threadEntity = lastRoundChat.threads.cache.get(thread)
		if (!threadEntity) continue

		if (threadEntity.createdTimestamp < fiveHourAgo)
			threadEntity.setLocked(true, "Time expired.")
	}
}

const handlePredatorRound = async (round_id: string, map_name?: string) => {
	const { client } = container;

	if (!process.env.CM13_BOT_DISCORD_GUILD_YAUTJA_CHANNEL) return

	const channel = client.channels.cache.get(process.env.CM13_BOT_DISCORD_GUILD_YAUTJA_CHANNEL)
	if (!(channel instanceof TextChannel)) return

	const webhook = await fetchOrCreateHook(channel)

	const notificationEmbed = new EmbedBuilder();
	notificationEmbed.setDescription(`Round ${round_id} is a Predator Round. You may Join the Hunt! Current map: ${map_name}`)
	notificationEmbed.setTitle('Predator Round')
	notificationEmbed.setTimestamp()
	notificationEmbed.setColor('DarkGreen')

	await webhook.send({
		content: `${roleMention(process.env.CM13_BOT_DISCORD_GUILD_YAUTJA_PING_ROLE)}`,
		embeds: [notificationEmbed],
		username: process.env.CM13_BOT_DISCORD_YAUTJA_WEBHOOK_NAME,
		avatarURL: process.env.CM13_BOT_DISCORD_YAUTJA_WEBHOOK_PROFILE_PICTURE
	})
}
