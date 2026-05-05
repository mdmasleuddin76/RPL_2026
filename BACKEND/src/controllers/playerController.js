import Player from '../models/Player.js';

// GET ALL PLAYERS
export const getPlayers = async (req, res) => {
  try {
    const players = await Player.find().sort({ _id: 1 });
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ADD NEW PLAYER
export const addPlayer = async (req, res) => {
  try {
    const {
      name,
      role,
      battingStyle,
      bowlingStyle,
      // We remove avatarUrl from here because it's no longer coming from the text body
    } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required.' });
    }

    // Determine the avatar path
    // If a file was uploaded, req.file exists. We construct the path string.
    // If no file was uploaded, we can fall back to an empty string or a default avatar.
    let avatarUrl = '';
    if (req.file) {
      // This will look something like "/uploads/1695843029-avatar.png"
      avatarUrl = `/uploads/${req.file.filename}`;
    }

    const newPlayer = new Player({
      name,
      role,
      battingStyle,
      bowlingStyle,
      avatarUrl // Save the local path to the database
    });

    await newPlayer.save();

    res.status(201).json({
      message: 'Player added successfully.',
      player: newPlayer
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};