const { Client } = require("pg");
const NodeEnvironment = require("jest-environment-node");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const prismaBinary = "./node_modules/.bin/prisma";

class PostgresTestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);

    // Generate a unique schema identifier for this test context
    this.database = `serenity_test_${Date.now()}`;

    // Generate the pg connection string for the test schema
    this.connectionString = `postgres://prisma:prisma@localhost:5432/${this.database}`;
  }

  async setup() {
    // Set the required environment variable to contain the connection string
    // to our database
    process.env.POSTGRES_URL = this.connectionString;
    this.global.process.env.POSTGRES_URL = this.connectionString;

    // Run the migrations to ensure our schema has the required structure
    await exec(`${prismaBinary} migrate deploy`);
    // Regenerate client
    await exec(`${prismaBinary} generate`);
    return super.setup();
  }

  async teardown() {
    // Drop the database after the tests have completed
    const client = new Client({
      connectionString: "postgres://prisma:prisma@localhost:5432/prisma",
    });
    await client.connect();
    await client.query(`DROP DATABASE ${this.database}`);
    await client.end();
  }
}

module.exports = PostgresTestEnvironment;
