import Dexie from 'dexie';

export const db = new Dexie('ShopeeCalculatorDB');

// Define database schema
db.version(1).stores({
  inventory: '++id, name, statusToko, kategori',
  transactions: '++id, timestamp, date',
  assets: '++id, type, date',
  settings_general: 'id', // paymentFeeMall, orderFee
  settings_shopee: '++id', // master data
  settings_program: 'id', // program fees
  users: '++id, username'
});

// Helper function to seed initial data if empty
export const seedDatabase = async (defaultShopeeData, defaultProgramData, defaultProducts, defaultAssets) => {
  const shopeeCount = await db.settings_shopee.count();
  if (shopeeCount < 5000) {
    console.log("Seeding full shopee data...");
    await db.settings_shopee.clear();
    await db.settings_shopee.bulkAdd(defaultShopeeData);
  }

  const programCount = await db.settings_program.count();
  if (programCount === 0) {
    await db.settings_program.bulkAdd(defaultProgramData);
  }

  const generalCount = await db.settings_general.count();
  if (generalCount === 0) {
    await db.settings_general.add({ id: 'paymentFeeMall', value: 1.8 });
    await db.settings_general.add({ id: 'orderFee', value: 1250 });
  }

  const inventoryCount = await db.inventory.count();
  if (inventoryCount === 0) {
    await db.inventory.bulkAdd(defaultProducts);
  }

  const assetCount = await db.assets.count();
  if (assetCount === 0) {
    await db.assets.bulkAdd(defaultAssets);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.add({ 
      id: 'usr-1', 
      username: 'admin', 
      password: 'password123', 
      role: 'Admin', 
      createdAt: Date.now() 
    });
  }
};
