import Settings from '../models/Settings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if not exists
      settings = new Settings();
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { mealTimes, eggDay, siteName, contactNumber } = req.body;
    
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (mealTimes) settings.mealTimes = mealTimes;
    if (eggDay !== undefined) settings.eggDay = eggDay;
    if (siteName) settings.siteName = siteName;
    if (contactNumber) settings.contactNumber = contactNumber;
    
    settings.updatedBy = req.user.id;
    await settings.save();

    res.status(200).json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
