import { EmbedBuilder, TextChannel } from 'discord.js';
import { container } from '@sapphire/framework';

export const ingestTicket = async (message: string, channel: string) => {
	if (!process.env.CM13_BOT_DISCORD_GUILD_TICKET_CHANNEL || !channel) return;

	const { client } = container;

	const channelToUse = client.channels.cache.get(process.env.CM13_BOT_DISCORD_GUILD_TICKET_CHANNEL);
	if (!channelToUse || !(channelToUse instanceof TextChannel)) return;

	const data = JSON.parse(message);

	let author;

	if (data['recipient']) {
		author = `${data['recipient']}`;
	}

	if (data['sender']) {
		author = `${data['sender']}`;
	}

	if (data['sender'] && data['recipient']) {
		author = `${data['sender']} -> ${data['recipient']}`;
	}

	const embedToSend = new EmbedBuilder();
	embedToSend.setTitle(`#${data['ticket-id']}: ${author}`);
	embedToSend.setURL(`https://db.cm-ss13.com/ticket/${data.round_id}/${data['ticket-id']}`)
	embedToSend.setDescription(`${data['message']}`);
	embedToSend.setColor('DarkAqua');
	embedToSend.setTimestamp();
	embedToSend.setFooter({ text: `@${data['source']}` });

	channelToUse.send({ embeds: [embedToSend] });
};
