document.addEventListener("DOMContentLoaded", () => {
    // ---------- ELEMENT SELECTORS ----------
    const baselineSection = document.getElementById("baselineSection");
    const dailyBtn = document.getElementById("dailyCheckInBtn");
    const suggestionBox = document.getElementById("suggestionBox");

    // ---------- BASELINE FORM ELEMENTS ----------
    const baselineModal = document.getElementById("baselineModal");
    const baselineForm = document.getElementById("baselineForm");
    const editBaselineBtn = document.getElementById("editBaselineBtn");
    const baselineCloseBtn = document.getElementById("baselineCloseBtn");
    const intensityInput = baselineForm.elements["intensity"];
    const intensityDisplay = document.getElementById("intensityValue");

    // ---------- DAILY CHECK-IN ELEMENTS ----------
    const dailyModal = document.getElementById("dailyModal");
    const dailyForm = document.getElementById("dailyFormContainer"); // now a single <form>
    const dailyCloseBtn = document.getElementById("dailyCloseBtn");
    const dailySubmitBtn = document.getElementById("dailySubmitBtn");

    let dailyData = {};

    // ---------- UTILS ----------
    const createSelect = (name, options, allowOther = false) => {
        const select = document.createElement("select");
        select.name = name;
        select.required = true;

        options.forEach(opt => {
            const el = document.createElement("option");
            el.value = opt;
            el.textContent = opt;
            select.appendChild(el);
        });

        if (allowOther) {
            const el = document.createElement("option");
            el.value = "Other";
            el.textContent = "Other";
            select.appendChild(el);
        }

        const wrapper = document.createElement("div");
        wrapper.appendChild(select);

        // show text input if "Other" is selected
        const otherInput = document.createElement("input");
        otherInput.type = "text";
        otherInput.maxLength = 255;
        otherInput.placeholder = "Please specify";
        otherInput.style.display = "none";
        wrapper.appendChild(otherInput);

        select.addEventListener("change", () => {
            if (select.value === "Other") {
                otherInput.style.display = "block";
                otherInput.required = true;
            } else {
                otherInput.style.display = "none";
                otherInput.required = false;
            }
        });

        return wrapper;
    };

    const createTextInput = (name, type = "text", placeholder = "") => {
        const input = document.createElement("input");
        input.type = type;
        input.name = name;
        input.placeholder = placeholder;
        input.maxLength = 255;
        input.required = true;
        const wrapper = document.createElement("div");
        wrapper.appendChild(input);
        return wrapper;
    };

    const createNumberInput = (name, min = 0, max = 200, placeholder = "") => {
        const input = document.createElement("input");
        input.type = "number";
        input.name = name;
        input.min = min;
        input.max = max;
        input.placeholder = placeholder;
        input.required = true;
        const wrapper = document.createElement("div");
        wrapper.appendChild(input);
        return wrapper;
    };

    // ---------- FETCH BASELINE ----------
    async function loadBaseline() {
        try {
            const res = await fetch("/baseline");
            const data = await res.json();
            if (data.ok && data.baseline) {
                populateBaselineForm(data.baseline, data.preferences, data.goals);
            }
        } catch (err) {
            console.error("Error loading baseline:", err);
        }
    }

    function parseHeightString(heightStr) {
        // expects "5'10\"" or "178 cm"
        if (!heightStr) return { feet: "", inches: "", unit: "ft/in" };
        if (heightStr.includes("cm")) {
            return { cm: parseInt(heightStr), unit: "cm" };
        } else if (heightStr.includes("'")) {
            const match = heightStr.match(/(\d+)'(\d+)?/);
            return { feet: match ? match[1] : "", inches: match ? match[2] : "", unit: "ft/in" };
        }
        return { feet: "", inches: "", cm: "", unit: "ft/in" };
    }

    function parseWeightString(weightStr) {
        if (!weightStr) return { weight: "", unit: "lbs" };
        if (weightStr.includes("kg")) return { weight: parseInt(weightStr), unit: "kg" };
        else return { weight: parseInt(weightStr), unit: "lbs" };
    }

    function populateBaselineForm(baseline, preferences, goals) {
        baselineForm.elements["age_years"].value = baseline.age_years || "";
        baselineForm.elements["gender"].value = baseline.gender || "";

        const heightData = parseHeightString(baseline.height);
        if (heightData.unit === "cm") {
            baselineForm.elements["height_cm"].value = heightData.cm;
            baselineForm.elements["height_unit"].value = "cm";
        } else {
            baselineForm.elements["height_ft"].value = heightData.feet;
            baselineForm.elements["height_in"].value = heightData.inches;
            baselineForm.elements["height_unit"].value = "ft/in";
        }

        const weightData = parseWeightString(baseline.user_weight);
        baselineForm.elements["weight_value"].value = weightData.weight;
        baselineForm.elements["weight_unit"].value = weightData.unit;

        baselineForm.elements["medical_condition"].value = baseline.medical_condition || "";
        baselineForm.elements["activity_level"].value = baseline.activity_level || "";
        baselineForm.elements["dietary_preferences"].value = baseline.dietary_preferences || "";

        baselineForm.elements["primary_goal"].value = goals.primary_goal || "";
        baselineForm.elements["short_goal"].value = goals.short_goal || "";
        baselineForm.elements["long_goal"].value = goals.long_goal || "";
        baselineForm.elements["days_goal"].value = goals.days_goal || "";

        baselineForm.elements["intensity"].value = preferences.intensity || 5;
        intensityDisplay.textContent = preferences.intensity || 5;
        baselineForm.elements["exercise_enjoyment"].value = preferences.exercise_enjoyment || "";
    }
    // ---------- INTENSITY SLIDER ----------
    if (intensityInput && intensityDisplay) {
        intensityInput.addEventListener('input', () => {
            intensityDisplay.textContent = intensityInput.value;
        });
    }

    // ---------- SUBMIT BASELINE ----------
    baselineForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Combine height/weight
        const heightUnit = baselineForm.elements["height_unit"].value;
        let heightStr = "";
        if (heightUnit === "cm") {
            heightStr = baselineForm.elements["height_cm"].value + " cm";
        } else {
            heightStr = `${baselineForm.elements["height_ft"].value}'${baselineForm.elements["height_in"].value}"`;
        }

        const weightStr = baselineForm.elements["weight_value"].value + " " + baselineForm.elements["weight_unit"].value;

        const payload = {
            age_years: parseInt(baselineForm.elements["age_years"].value),
            gender: baselineForm.elements["gender"].value,
            height: heightStr,
            user_weight: weightStr,
            medical_condition: baselineForm.elements["medical_condition"].value,
            activity_level: baselineForm.elements["activity_level"].value,
            dietary_preferences: baselineForm.elements["dietary_preferences"].value,
            primary_goal: baselineForm.elements["primary_goal"].value,
            short_goal: baselineForm.elements["short_goal"].value,
            long_goal: baselineForm.elements["long_goal"].value,
            days_goal: parseInt(baselineForm.elements["days_goal"].value),
            intensity: parseInt(baselineForm.elements["intensity"].value),
            exercise_enjoyment: baselineForm.elements["exercise_enjoyment"].value
        };

        try {
            const res = await fetch("/baseline", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.ok) {
                alert("Baseline updated!");
                loadBaseline(); // refresh values
            }
        } catch (err) {
            console.error("Error updating baseline:", err);
        }
    });


    // ---------- DAILY FORM BUILDER ----------
    function buildDailyForm(existingData = {}) {
        dailyForm.innerHTML = ""; // clear previous

        const questions = [
            { type: "select", name: "energyLevel", label: "How are you feeling today?", options: ["Energetic", "Neutral", "Tired", "Stressed", "Other"], allowOther: true },
            { type: "number", name: "sleepHours", label: "How many hours have you slept?", min: 0, max: 24 },
            { type: "text", name: "meals", label: "What and how much did you eat today?" },
            { type: "text", name: "hydration", label: "What and how much did you drink today?" },
            { type: "select", name: "didExercise", label: "Did you exercise today?", options: ["Yes", "No"] },
            { type: "text", name: "exerciseType", label: "If yes, what type of exercise?" },
            { type: "text", name: "exerciseDuration", label: "How long was your workout? Type N/A if no workout today." },
            { type: "select", name: "workoutFeelingDuring", label: "How did you feel during your workout?", options: ["Great", "Okay", "Struggling", "Other", "N/A"], allowOther: true },
            { type: "select", name: "workoutFeelingAfter", label: "How did you feel after your workout?", options: ["Great", "Okay", "Struggling", "Other", "N/A"], allowOther: true },
            { type: "select", name: "followed", label: "Did you follow the suggestions or goals from your last check-in?", options: ["Yes", "No", "Partially"] },
            { type: "text", name: "workedWell", label: "What worked well today?" },
            { type: "text", name: "otherNotes", label: "Any other comments or thoughts about your day?", required: false }
        ];

        questions.forEach(q => {
            const label = document.createElement("label");
            label.textContent = q.label;
            dailyForm.appendChild(label);

            let input;
            switch (q.type) {
                case "select":
                    input = createSelect(q.name, q.options, q.allowOther);
                    break;
                case "text":
                    input = createTextInput(q.name);
                    break;
                case "number":
                    input = createNumberInput(q.name, q.min, q.max);
                    break;
            }

            // prefill if existingData
            const fieldName = q.name;
            if (existingData[fieldName] !== undefined) {
                if (input.querySelector("select")) {
                    const sel = input.querySelector("select");
                    if (sel.querySelector(`option[value='${existingData[fieldName]}']`)) {
                        sel.value = existingData[fieldName];
                    } else {
                        sel.value = "Other";
                        sel.nextElementSibling.value = existingData[fieldName];
                        sel.nextElementSibling.style.display = "block";
                    }
                } else {
                    input.querySelector("input").value = existingData[fieldName];
                }
            }

            dailyForm.appendChild(input);
        });
    }

    // ---------- DAILY FORM EVENTS ----------
    dailyBtn.addEventListener("click", async () => {
        try {
            // Check if user has a baseline
            const res = await fetch("/checkBaseline");
            const data = await res.json();

            if (!data.ok) {
                alert("Could not verify baseline.");
                return;
            }

            if (!data.hasBaseline) {
                alert("Please fill out your baseline before doing a daily check-in.");
                baselineModal.style.display = "block";
                return;
            }

            // Show daily check-in form
            dailyModal.style.display = "block";
            buildDailyForm(dailyData);
        } catch (err) {
            console.error("Error checking baseline:", err);
        }
    });

    dailyCloseBtn.addEventListener("click", () => dailyModal.style.display = "none");

    dailySubmitBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // collect form data
        const formElements = dailyForm.querySelectorAll("input, select");
        formElements.forEach(el => {
            if (!el.name) return;
            if (el.tagName === "SELECT" && el.value === "Other") {
                dailyData[el.name] = el.nextElementSibling.value;
            } else {
                dailyData[el.name] = el.value;
            }
        });

        // handle exercise skip
        if (dailyData.didExercise === "No") {
            dailyData.exerciseType = null;
            dailyData.exerciseDuration = null;
            dailyData.workoutFeelingDuring = null;
            dailyData.workoutFeelingAfter = null;
        }

        try {
            const res = await fetch("/daily", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ daily: dailyData })
            });
            const data = await res.json();
            if (data.ok) {
                alert("Daily Check-In submitted!");
                dailyModal.style.display = "none";
            }
        } catch (err) {
            console.error("Error submitting daily check-in:", err);
        }
    });
    // ---------- INITIAL LOAD ----------
    loadBaseline();

    if (intensityInput && intensityDisplay) {
        intensityInput.addEventListener('input', () => {
            intensityDisplay.textContent = intensityInput.value;
        });
    }
});
