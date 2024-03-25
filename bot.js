require("dotenv").config();
const AWS = require("aws-sdk");
const fs = require("fs");
const { Op } = require("sequelize");
const { DiscDB, searchMarket, updateDisc } = require("./db");
const { Client, EmbedBuilder, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log("Ready!");
  console.log(`Logged in as ${client.user.tag}`);
});

// Create an S3 service object
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// Reusable function to create a Discord embed
function createEmbed(
  title,
  description,
  color,
  fields,
  footer,
  image,
  ephemeral
) {
  embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  if (image) {
    embed.setImage(image);
  }

  // Add a footer to the embed
  if (footer) {
    embed.setFooter({ text: footer });
  }

  // Add fields to the embed
  fields.forEach((field) => {
    embed.addFields({
      name: field.name,
      value: field.value,
      inline: field.inline,
    });
  });

  return { embeds: [embed], ephemeral: ephemeral };
}
// Using the function in the list command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = interaction.commandName;

  if (command === "list") {
    await interaction.deferReply();
    // await interaction.editReply({
    //   content: "Processing your request...",
    //   ephemeral: true,
    // });
    try {
      // Extract options from the interaction
      const brand = interaction.options.getString("brand");
      const name = interaction.options.getString("name");
      const weight = interaction.options.getInteger("weight");
      const color = interaction.options.getString("color");
      const plastic = interaction.options.getString("plastic");
      const lookingFor = interaction.options.getString("looking-for");
      const imageAttachment = interaction.options.getAttachment("image");

      let imageURL = null;

      if (imageAttachment) {
        // Use the attachment URL directly as the imageURL
        imageURL = imageAttachment.url;
      }

      // Get the user ID of the interaction's author
      const owner = interaction.user.id;

      // Create a new disc record in the database
      const newDisc = await DiscDB.create({
        brand: brand,
        name: name,
        weight: weight,
        color: color,
        plastic: plastic,
        lookingFor: lookingFor,
        image_url: imageURL || null, // Optional image URL
        owner: owner,
        status: "Listed",
      });

      // Create an embed with the details of the newly added disc
      const embed = createEmbed(
        "New Disc Added to Market",
        `"${newDisc.brand} ${newDisc.name}" has been added to the trade market.`,
        "#0099ff",
        [
          { name: "Brand", value: newDisc.brand, inline: true },
          { name: "Name", value: newDisc.name, inline: true },
          { name: "Weight", value: `${newDisc.weight}g`, inline: true },
          { name: "Color", value: newDisc.color, inline: true },
          { name: "Plastic", value: newDisc.plastic, inline: true },
          { name: "Looking For", value: newDisc.lookingFor, inline: true },
          { name: "Owner", value: `<@${newDisc.owner}>`, inline: true },
        ],
        `Disc ID: ${newDisc.id}`,
        imageURL,
        false // Ephemeral set to false to make the message visible to everyone
      );

      // Respond with the embed
      await interaction.editReply(embed);
    } catch (error) {
      console.error("Error adding disc:", error);
      await interaction.editReply({
        content: "An error occurred while adding the disc.",
        ephemeral: true,
      });
    }
  }
  if (command === "remove") {
    try {
      // Extract the ID of the disc to remove from the options
      const discId = interaction.options.getInteger("id");

      // Find the disc in the database by its ID
      const discToRemove = await DiscDB.findByPk(discId);

      // If the disc is not found, respond with an error message
      if (!discToRemove) {
        await interaction.reply({
          content: "Disc not found.",
          ephemeral: true,
        });
        return;
      }

      // Remove the disc from the database
      await discToRemove.destroy();

      // Respond with a success message
      await interaction.reply({
        content: `Disc "${discToRemove.brand} ${discToRemove.name}" has been removed from the trade market.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error removing disc:", error);
      await interaction.reply({
        content: "An error occurred while removing the disc.",
        ephemeral: true,
      });
    }
  }
  if (command === "inventory") {
    try {
      const ownerId = interaction.options.getUser("owner")?.id || null;
      const user = interaction.user.id;

      let discs;
      let ownerText = "all users";

      if (ownerId) {
        discs = await DiscDB.findAll({ where: { owner: ownerId } });
        ownerText = `<@${ownerId}>`;
      } else {
        discs = await DiscDB.findAll();
      }

      // If no discs are found for the specified owner, respond with a message
      if (discs.length === 0) {
        await interaction.reply({
          content: `No discs found ${ownerText}.`,
          ephemeral: true,
        });
        return;
      }

      // Create fields for the embed representing each disc in the inventory
      const fields = discs.map((disc) => ({
        name: `${disc.brand} ${disc.name}`,
        value: `Weight: ${disc.weight}g\nColor: ${disc.color}\nPlastic: ${
          disc.plastic
        }\nLooking For: ${disc.lookingFor}${
          ownerId ? "" : `\nOwner: <@${disc.owner}>`
        }${disc.image_url ? `\nImage: [View](${disc.image_url})` : ""}${
          user === disc.owner ? "\nID: " + disc.id : ""
        }`,
        inline: true,
      }));

      const embed = createEmbed(
        "Inventory",
        `Here are the discs in the inventory for ${ownerText}:`,
        "#0099ff",
        fields,
        ownerId,
        null,
        true
      );

      console.log(embed.embeds[0]);

      // Respond with an embed containing the discs in the inventory
      await interaction.reply({
        embeds: [embed.embeds[0]],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      await interaction.reply({
        content: "An error occurred while fetching the inventory.",
        ephemeral: true,
      });
    }
  }
  if (interaction.commandName === "searchmarket") {
    try {
      const query = interaction.options.getString("query");
      const discs = await searchMarket(query);

      console.log(discs);

      if (discs.length === 0) {
        await interaction.reply({
          content: "No discs found in the market matching that query.",
          ephemeral: true,
        });
        return;
      }

      // Construct the response embed
      const fields = discs.map((disc) => ({
        name: `${disc.brand} ${disc.name}`,
        value: `Weight: ${disc.weight}g\nColor: ${disc.color}\nPlastic: ${
          disc.plastic
        }\nLooking For: ${disc.lookingFor}\nOwner: <@${disc.owner}>\n${
          disc.image_url ? `Image: [View](${disc.image_url})` : ""
        }`,
        inline: false,
      }));

      // Create the embed using the createEmbed function
      const embed = createEmbed(
        "Search Results",
        "Here are the discs found in the market matching your query:",
        "#0099ff",
        fields,
        null, // no image for this embed
        null, // No footer for this embed
        true
      );

      await interaction.reply(embed); // Reply with the embed
    } catch (error) {
      console.error("Error searching market:", error);
      await interaction.reply({
        content: "An error occurred while searching the market.",
        ephemeral: true,
      });
    }
  }
});

const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);
