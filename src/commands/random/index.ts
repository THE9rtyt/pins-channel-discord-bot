import { SlashCommandBuilder } from '@discordjs/builders'
import { autoId } from '@google-cloud/firestore/build/src/util.js'
import { Snowflake } from 'discord.js'

import { constructPinMessageEmbed } from '../../handlers/pins/pinThresholdMet.js'
import { Command } from '../../types/commands'
import { db } from '../../utils/firebase/clients.js'

async function getRandomPinnedMessageData(guildId: Snowflake) {
  // https://stackoverflow.com/questions/46798981/firestore-how-to-get-random-documents-in-a-collection
  const messagesCollection = db
    .collection(guildId)
    .doc('data')
    .collection('pinned_messages')
  let randomQueryRef = await messagesCollection
    .where('__name__', '>=', autoId())
    .orderBy('__name__')
    .limit(1)
  if ((await randomQueryRef.get()).empty) {
    randomQueryRef = await messagesCollection
      .where('__name__', '>=', ' ')
      .orderBy('__name__')
      .limit(1)
  }
  const randomQueryData = (await randomQueryRef.get()).docs
  return randomQueryData[0].data()
}

const randomCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Get a random message from the pins channel'),
  async execute(interaction) {
    if (!interaction.guild) throw new Error('command must be run in a guild.')

    let pinnedMessage = null
    const pinnedMessageData = await getRandomPinnedMessageData(
      interaction.guild.id,
    )
    const channels = await interaction.guild.channels.fetch()
    for (const channelTuple of channels) {
      if (!pinnedMessage && channelTuple[1].isText()) {
        try {
          const message = await channelTuple[1].messages.fetch(
            pinnedMessageData.message_id,
          )
          if (message.id === pinnedMessageData.message_id)
            pinnedMessage = message
        } catch (error) {
          continue
        }
      }
    }
    if (!pinnedMessage) throw new Error('no message found')
    const pinMessageEmbed = constructPinMessageEmbed(pinnedMessage)
    await interaction.reply({ embeds: [pinMessageEmbed] })
  },
}

export default randomCommand