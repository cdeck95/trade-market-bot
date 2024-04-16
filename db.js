require("dotenv").config();
const fuzzball = require("fuzzball");

const { Sequelize, Model, DataTypes, Op } = require("sequelize");
// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);
// Defining the model
const DiscDB = sequelize.define(
  "DiscDB",
  {
    // Assuming id is automatically generated
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    plastic: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true, // This makes the field optional
    },
    lookingFor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date_listed: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
    date_sold: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Additional model options go here
    tableName: "discs_inventory",
    timestamps: false, // Assuming you're managing dates manually
  }
);

// Sync the model with the database
async function syncDB() {
  try {
    await sequelize.authenticate(); // Test the database connection
    console.log(
      "Connection to the database has been established successfully."
    );
    await sequelize.sync(); // Sync the model with the database
    console.log("The table for the Disc model was just (re)created!");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1); // Exit the process with an error code
  }
}

async function updateDisc(discId, updates) {
  try {
    console.log("Received update parameters:", updates);
    const disc = await DiscDB.findByPk(discId);
    if (!disc) {
      throw new Error("Disc not found");
    }
    await disc.update(updates);
  } catch (error) {
    console.error("Error updating disc:", error);
    throw new Error("Failed to update disc");
  }
}

async function searchMarket(query, threshold = 50) {
  try {
    // Example query to find all discs in the market
    const allDiscs = await DiscDB.findAll();

    // Extract disc names and brands from the database records
    const discNames = allDiscs.map((disc) => disc.name);
    const discBrands = allDiscs.map((disc) => disc.brand);

    // Perform fuzzy search on disc names and brands
    const nameResults = fuzzball.extract(query, discNames);
    const brandResults = fuzzball.extract(query, discBrands);

    // Combine results and remove duplicates
    const combinedResults = [...nameResults, ...brandResults];
    const uniqueResults = combinedResults.filter(
      (result, index, self) =>
        index === self.findIndex((r) => r[0] === result[0])
    );

    // Filter results by score threshold
    const filteredResults = uniqueResults.filter(
      (result) => result[1] >= threshold
    );

    // Fetch full disc details for matched names and brands
    const matchedDiscs = await DiscDB.findAll({
      where: {
        [Op.or]: filteredResults.map((result) => ({
          [Op.or]: [{ name: result[0] }, { brand: result[0] }],
        })),
      },
    });

    return matchedDiscs;
  } catch (error) {
    console.error("Error searching market:", error);
    throw error;
  }
}

// Export the model and sync function
module.exports = { DiscDB, syncDB, searchMarket, updateDisc };
