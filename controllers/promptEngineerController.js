// controllers/promptEngineerController.js
const pool = require('../config');

const getPromptEngineerPage = (req, res) => {
    res.render('prompt-engineer');
};

const submitPromptEngineerData = async (req, res) => {
    const {
        age,
        gender,
        height,
        height_units,
        weight,
        weight_units,
        medical_conditions,
        difficulty,
        activity_level,
        exercise_enjoyment,
        dietary_restrictions,
        primary_goal,
        short_term_goals,
        long_term_goals,
        days_per_week
    } = req.body;

    try {
        const conn = await pool.getConnection();
        await conn.query(
            `INSERT INTO prompt_engineer_data (
                user_id, age, gender, height, height_units, weight, weight_units,
                medical_conditions, difficulty, activity_level, exercise_enjoyment,
                dietary_restrictions, primary_goal, short_term_goals, long_term_goals,
                days_per_week
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.session.userId, age, gender, height, height_units, weight, weight_units,
                medical_conditions, difficulty, activity_level, exercise_enjoyment,
                dietary_restrictions, primary_goal, short_term_goals, long_term_goals,
                days_per_week
            ]
        );
        conn.release();
        res.redirect('/dashboard');
    } catch (err) {
        console.error('submitPromptEngineerData error:', err);
        res.status(500).send('Could not save prompt engineer data');
    }
};

module.exports = {
    getPromptEngineerPage,
    submitPromptEngineerData
};
