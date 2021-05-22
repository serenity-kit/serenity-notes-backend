import crypto from "crypto";
const { Client } = require("pg");

export const logContactTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."Contact";`
    `SELECT * FROM "Contact";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logOneTimeKeyTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."OneTimeKey";`
    `SELECT * FROM "OneTimeKey";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logDeviceTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."Device";`
    `SELECT * FROM "Device";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logContentTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."Content";`
    `SELECT * FROM "Content";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logGroupSessionMessageTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."GroupSessionMessage";`
    `SELECT * FROM "GroupSessionMessage";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logRepositoriesTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."Repository";`
    `SELECT * FROM "Repository";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logRepositoryCollaboratorsTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."_RepositoryToUser";`
    `SELECT * FROM "_RepositoryToUser";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logRepositoryContactTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."Contact";`
    `SELECT * FROM "Contact";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logContactInvitationTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."ContactInvitation";`
    `SELECT * FROM "ContactInvitation";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const logBillingAccountEmailTokenTable = async () => {
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  const contentResult = await client.query(
    // `SELECT * FROM "${process.env.POSTGRES_DB_SCHEMA}"."BillingAccountEmailToken";`
    `SELECT * FROM "BillingAccountEmailToken";`
  );
  console.log(contentResult.rows);
  await client.end();
};

export const updateBillingAccountEmailToken = async (rawToken: string) => {
  const token = crypto.createHash("sha256").update(rawToken).digest("base64");
  const client = new Client({ connectionString: process.env.POSTGRES_URL });
  await client.connect();
  await client.query(
    // `UPDATE "${process.env.POSTGRES_DB_SCHEMA}"."BillingAccountEmailToken" SET "emailToken" = '${token}';`
    `UPDATE "BillingAccountEmailToken" SET "emailToken" = '${token}';`
  );
  await client.end();
};
