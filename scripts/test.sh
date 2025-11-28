#!/usr/bin/env bash

if [ "$1" != "register" ]; then
    curl -X POST http://localhost:3000/auth/register \
    -H 'Content-Type: application/json' \
    -d '{
        "name": "Test User",
        "email": "test@test.com",
        "password": "testpassword",
        "confirmPassword": "testpassword"
    }'
    echo "Registered user"
    sleep 1
else 
    echo "Skipping registration"
    curl -X POST http://localhost:3000/auth/login \
    -H 'Content-Type: application/json' \
    -d '{
        "email": "test@test.com",
        "password": "testpassword"
    }'
    echo "Logged in user"
    sleep 1
fi

set -euo pipefail

# ---------- HELPERS ----------
rand_choice() {
  local arr=("$@")
  echo "${arr[RANDOM % ${#arr[@]}]}"
}

rand_int() {
  local min=$1
  local max=$2
  echo $(( RANDOM % (max - min + 1) + min ))
}

# ---------- RANDOM BASELINE PAYLOAD ----------
genders=("Male" "Female" "Non-binary")
activity_levels=("Sedentary" "Light" "Moderate" "Active" "Very Active")
diet_prefs=("None" "Vegetarian" "Vegan" "Low Carb" "High Protein")
medical_conditions=("None" "Asthma" "Diabetes" "Hypertension" "Back pain")
primary_goals=("Lose weight" "Gain muscle" "Improve endurance" "Maintain weight")
intensity_levels=("Low" "Moderate" "High")
exercise_enjoyment_levels=("Low" "Moderate" "High")

age_years=$(rand_int 18 70)
gender=$(rand_choice "${genders[@]}")
height_in=$(rand_int 58 78)          # 4'10" to 6'6" (just send inches as number)
user_weight=$(rand_int 120 250)      # lbs
medical_condition=$(rand_choice "${medical_conditions[@]}")
activity_level=$(rand_choice "${activity_levels[@]}")
dietary_preferences=$(rand_choice "${diet_prefs[@]}")
primary_goal=$(rand_choice "${primary_goals[@]}")

# Make short/long goals match the primary_goal somewhat
if [[ "$primary_goal" == "Lose weight" ]]; then
  short_goal="Lose $(rand_int 3 8) pounds"
  long_goal="Lose $(rand_int 15 30) pounds"
elif [[ "$primary_goal" == "Gain muscle" ]]; then
  short_goal="Gain muscle and strength"
  long_goal="Build lean muscle over time"
elif [[ "$primary_goal" == "Improve endurance" ]]; then
  short_goal="Do cardio 3x per week"
  long_goal="Run a 5K without stopping"
else
  short_goal="Stay consistent with habits"
  long_goal="Maintain current weight and health"
fi

days_goal=$(rand_int 21 90)
intensity=$(rand_choice "${intensity_levels[@]}")
exercise_enjoyment=$(rand_choice "${exercise_enjoyment_levels[@]}")


baseline_payload=$(cat <<EOF
{
  "age_years": $age_years,
  "gender": "$gender",
  "height": $height_in,
  "user_weight": $user_weight,
  "medical_condition": "$medical_condition",
  "activity_level": "$activity_level",
  "dietary_preferences": "$dietary_preferences",
  "primary_goal": "$primary_goal",
  "short_goal": "$short_goal",
  "long_goal": "$long_goal",
  "days_goal": $days_goal,
  "intensity": "$intensity",
  "exercise_enjoyment": "$exercise_enjoyment"
}
EOF
)
echo "Baseline payload:"
echo "$baseline_payload"

energy_levels=("Energetic" "Neutral" "Tired" "Stressed")
did_exercise_opts=("Yes" "No")
workout_feelings=("Great" "Okay" "Struggling" "N/A")
followed_opts=("Yes" "No" "Partially")
meal_examples=("eggs and toast" "chicken and rice" "salad" "pasta" "oatmeal" "sandwich")
drink_examples=("water" "water and coffee" "electrolyte drink" "soda" "tea")
exercise_types=("Running" "Walking" "Cycling" "Strength training" "Yoga" "HIIT")
durations=("15 min" "20 min" "30 min" "45 min" "60 min")

for i in {0..40}; do
  energyLevel=$(rand_choice "${energy_levels[@]}")
  sleepHours=$(rand_int 4 10)
  meals=$(rand_choice "${meal_examples[@]}")
  hydration=$(rand_choice "${drink_examples[@]}")
  didExercise=$(rand_choice "${did_exercise_opts[@]}")
  followed=$(rand_choice "${followed_opts[@]}")
  workedWell="Felt good about staying on track"
  otherNotes=""
    echo "Generating daily payload for day $i" 
  if [[ "$didExercise" == "Yes" ]]; then
    exerciseType=$(rand_choice "${exercise_types[@]}")
    exerciseDuration=$(rand_choice "${durations[@]}")
    workoutFeelingDuring=$(rand_choice "${workout_feelings[@]}")
    workoutFeelingAfter=$(rand_choice "${workout_feelings[@]}")

    daily_payload=$(cat <<EOF
{
  "daily": {
    "energyLevel": "$energyLevel",
    "sleepHours": $sleepHours,
    "meals": "$meals",
    "hydration": "$hydration",
    "didExercise": "$didExercise",
    "exerciseType": "$exerciseType",
    "exerciseDuration": "$exerciseDuration",
    "workoutFeelingDuring": "$workoutFeelingDuring",
    "workoutFeelingAfter": "$workoutFeelingAfter",
    "followed": "$followed",
    "workedWell": "$workedWell",
    "otherNotes": "$otherNotes"
  }
}
EOF
)
    echo "$daily_payload"
  else
    # No exercise → null for those fields to match your server logic
    daily_payload=$(cat <<EOF
{
  "daily": {
    "energyLevel": "$energyLevel",
    "sleepHours": $sleepHours,
    "meals": "$meals",
    "hydration": "$hydration",
    "didExercise": "$didExercise",
    "exerciseType": null,
    "exerciseDuration": null,
    "workoutFeelingDuring": null,
    "workoutFeelingAfter": null,
    "followed": "$followed",
    "workedWell": "$workedWell",
    "otherNotes": "$otherNotes"
  }
}
EOF
)
    echo "$daily_payload"
  fi

  curl -X POST http://localhost:3000/debug/daily \
    -H 'Content-Type: application/json' \
    -d "$daily_payload"
done