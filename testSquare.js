const client = require("./config/squareClient");

async function testSquare() {
  try {
    const { result } = await client.locationsApi.listLocations();
    console.log("✅ Conexión exitosa con Square:", result);
  } catch (error) {
    console.error("❌ Error conectando con Square:", error);
  }
}

testSquare();
