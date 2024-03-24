require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");

const commands = [
  new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists a disc for trade")
    .addStringOption((option) =>
      option
        .setName("brand")
        .setDescription("The brand of the disc")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The name of the disc")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("weight")
        .setDescription("The weight of the disc in grams")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("The color of the disc")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("plastic")
        .setDescription("The type of plastic of the disc")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("price")
        .setDescription('The price of the disc (US Dollars or "negotiable")')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("inventory")
    .setDescription(
      "Shows the inventory of a user. If no one is specified, it will show the entire inventory."
    )
    .addUserOption(
      (option) =>
        option
          .setName("owner")
          .setDescription(
            "The owner of the inventory to show. If no one is specified, it will show the entire inventory."
          )
          .setRequired(false) // Making the option optional
    ),
  new SlashCommandBuilder()
    .setName("searchmarket")
    .setDescription("Searches the market by brand or disc name")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("The brand or disc name to search for")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Removes a disc listing")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the disc to remove")
        .setRequired(true)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();
