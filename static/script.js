const grid = document.getElementById('grid');
const solveBtn = document.getElementById('solve-btn');
const randomizeBtn = document.getElementById('randomize-btn');
const algorithmSelect = document.getElementById('algorithm');
const statusText = document.getElementById('status-text');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const playBtn = document.getElementById('play-btn');
const stepControls = document.querySelector('.step-controls');
const progressBar = document.getElementById('progress-bar');
const progressBarContainer = document.querySelector('.progress-bar-container');

let currentState = [1, 2, 3, 4, 5, 0, 7, 8, 6]; // Initial solvability unknown, will set random valid one on load or just use this test one that is 1 move away from goal?
// Goal: 1 2 3 4 5 6 7 8 0
// Simple valid start: 1, 2, 3, 4, 0, 6, 7, 5, 8
currentState = [1, 2, 3, 4, 0, 6, 7, 5, 8];

let solutionPath = [];
let currentStepIndex = 0;
let isPlaying = false;
let playInterval;

function renderGrid(state) {
    grid.innerHTML = '';
    state.forEach(num => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        if (num === 0) {
            tile.classList.add('empty');
        } else {
            tile.textContent = num;
        }
        grid.appendChild(tile);
    });
}

// Function to check solvability (Inversions count)
function getInversions(arr) {
    let inv = 0;
    const cleanArr = arr.filter(n => n !== 0);
    for (let i = 0; i < cleanArr.length; i++) {
        for (let j = i + 1; j < cleanArr.length; j++) {
            if (cleanArr[i] > cleanArr[j]) inv++;
        }
    }
    return inv;
}

function isSolvable(arr) {
    return getInversions(arr) % 2 === 0;
}

function generateRandomState() {
    let arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    do {
        // Fisher-Yates shuffle
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    } while (!isSolvable(arr));
    return arr;
}

randomizeBtn.addEventListener('click', () => {
    currentState = generateRandomState();
    renderGrid(currentState);
    resetSolution();
    statusText.textContent = "Randomized! Ready to solve.";
});

solveBtn.addEventListener('click', async () => {
    const algorithm = algorithmSelect.value;
    statusText.textContent = `Solving with ${algorithm.toUpperCase()}...`;
    solveBtn.disabled = true;
    randomizeBtn.disabled = true;

    try {
        const response = await fetch('/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start_state: currentState, algorithm: algorithm })
        });

        const data = await response.json();

        if (data.success) {
            solutionPath = data.path;
            currentStepIndex = 0;
            statusText.textContent = `Solved in ${solutionPath.length - 1} steps!`;
            stepControls.style.display = 'flex';
            progressBarContainer.style.display = 'block';
            updateControls();
        } else {
            statusText.textContent = "Failed to solve: " + data.message;
        }
    } catch (error) {
        statusText.textContent = "Error connecting to server.";
        console.error(error);
    } finally {
        solveBtn.disabled = false;
        randomizeBtn.disabled = false;
    }
});

function updateControls() {
    prevBtn.disabled = currentStepIndex === 0;
    nextBtn.disabled = currentStepIndex === solutionPath.length - 1;
    const progress = ((currentStepIndex) / (solutionPath.length - 1)) * 100;
    progressBar.style.width = `${progress}%`;
}

function showStep(index) {
    currentState = solutionPath[index];
    renderGrid(currentState);
    currentStepIndex = index;
    updateControls();
}

prevBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) showStep(currentStepIndex - 1);
});

nextBtn.addEventListener('click', () => {
    if (currentStepIndex < solutionPath.length - 1) showStep(currentStepIndex + 1);
});

playBtn.addEventListener('click', () => {
    if (isPlaying) {
        clearInterval(playInterval);
        playBtn.textContent = 'Play';
        isPlaying = false;
    } else {
        if (currentStepIndex === solutionPath.length - 1) currentStepIndex = 0;
        playBtn.textContent = 'Pause';
        isPlaying = true;
        playInterval = setInterval(() => {
            if (currentStepIndex < solutionPath.length - 1) {
                showStep(currentStepIndex + 1);
            } else {
                clearInterval(playInterval);
                playBtn.textContent = 'Play';
                isPlaying = false;
            }
        }, 500);
    }
});

function resetSolution() {
    solutionPath = [];
    currentStepIndex = 0;
    stepControls.style.display = 'none';
    progressBarContainer.style.display = 'none';
    clearInterval(playInterval);
    isPlaying = false;
    playBtn.textContent = 'Play';
}

// Init
renderGrid(currentState);
