      const CHALLENGE_BOX = document.getElementById('challenge-popup');
        const CHECKBOX = document.getElementById('recaptcha-checkbox');
        const CHECK_ICON = document.getElementById('check-icon');
        const CHALLENGE_TEXT = document.getElementById('challenge-text');
        const CHALLENGE_CONTENT_AREA = document.getElementById('challenge-content-area');
        const STATUS_MSG = document.getElementById('status-message');
        const VERSION_DISPLAY = document.getElementById('version-display');
        const LOADING_MODAL = document.getElementById('loading-modal');
        const STATUS_MODAL = document.getElementById('status-modal');
        const EMBEDDER_LOG = document.getElementById('embedder-log');
        
        let isVerified = false;
        let currentChallengeType = '';
        let currentVersion = '';
        let correctIndices = []; 
        let sequenceClicks = []; 
        let rotationalStates = []; 
        let v1CorrectText = ''; 
        
        // Promise handlers for the API-style interaction
        let resolveVerification = null;
        let rejectVerification = null;

        const CHALLENGE_ITEMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C'];
        const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']; 
        
        // --- UTILITY FUNCTIONS ---

        function randomString(length = 6) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
        
        /**
         * Adds a message to the simulated embedder's console.
         * @param {string} message 
         * @param {string} type - 'info', 'success', or 'error'
         */
        function logToEmbedder(message, type = 'info') {
            const logLine = document.createElement('div');
            logLine.classList.add('log-line');
            logLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            
            if (type === 'success') logLine.classList.add('log-success');
            if (type === 'error') logLine.classList.add('log-error');
            
            // Prepend new messages to the top
            EMBEDDER_LOG.prepend(logLine);
        }

        function showModal(message, type) {
            STATUS_MODAL.textContent = message;
            STATUS_MODAL.className = 'notification-modal';
            STATUS_MODAL.classList.add(type === 'success' ? 'modal-success' : 'modal-error');
            STATUS_MODAL.style.display = 'block';

            setTimeout(() => {
                STATUS_MODAL.style.display = 'none';
            }, 2500);
        }

        function showLoading() {
            LOADING_MODAL.style.display = 'block';
        }

        function hideLoading() {
            LOADING_MODAL.style.display = 'none';
        }

        function showStatusInPopup(message, type) {
            STATUS_MSG.textContent = message;
            STATUS_MSG.className = 'status-message mt-3 p-2 text-sm rounded-md text-center';
            STATUS_MSG.classList.add(type === 'success' ? 'status-success bg-green-100 text-green-800' : 'status-failure bg-red-100 text-red-800');
            STATUS_MSG.style.display = 'block';
        }

        function hideStatusInPopup() {
            STATUS_MSG.style.display = 'none';
        }

        // --- CORE API INTERFACE ---
        
        /**
         * Simulates the external API call. This is the function the "embedder" uses.
         * @returns {Promise<string>} A promise that resolves with a success token or rejects on failure.
         */
        function initiateCaptcha() {
            if (isVerified) {
                logToEmbedder("Verification already active/complete.", 'info');
                return Promise.resolve('ALREADY_VERIFIED_TOKEN');
            }

            return new Promise((resolve, reject) => {
                // Store the promise handlers globally
                resolveVerification = resolve;
                rejectVerification = reject;
                isVerified = false; // Reset status at start of new attempt
                
                showLoading();
                logToEmbedder("API call received. Running invisible behavior check...", 'info');
                
                // Simulate network delay for invisible background check
                setTimeout(() => {
                    hideLoading();
                    
                    // 30% chance of auto-pass (V3 Invisible success)
                    if (Math.random() < 0.000003) {
                        const token = 'SUCCESS_TOKEN_V3_INVISIBLE_' + randomString(12);
                        passChallenge(token); // Auto-pass without showing the box
                    } else {
                        // Present visual challenge
                        generateChallenge();
                    }
                }, 800); 
            });
        }
        
        /**
         * Called when the user clicks the checkbox element.
         * It calls the public API and handles the result.
         */
        function handleCaptchaClick() {
            // We only trigger the API call if the challenge box is not already open.
            if (CHALLENGE_BOX.style.display === 'flex') return;

            initiateCaptcha()
                .then(token => {
                    logToEmbedder(`Verification successful. Token received: ${token}`, 'success');
                    // Send token to the backend for final check... (Simulated success)
                })
                .catch(error => {
                    logToEmbedder(`Verification failed: ${error}`, 'error');
                });
        }
        
        // --- CHALLENGE HANDLERS ---
        
        const CHALLENGE_HANDLERS = {
            V1_TEXT: { setup: setupV1Text, verify: verifyV1Text },
            V3_GRID_MATCH: { setup: setupV3GridMatch, verify: verifyV3Grid },
            V3_SEQUENCE_CLICK: { setup: setupV3SequenceClick, verify: verifyV3Grid },
            V3_SWAP_PUZZLE: { setup: setupV3SwapPuzzle, verify: verifyV3SwapPuzzle },
            V3_PATH_DRAWING: { setup: setupV3PathDrawing, verify: verifyV3PathDrawing },
            V3_ROTATIONAL_PUZZLE: { setup: setupV3RotationalPuzzle, verify: verifyV3RotationalPuzzle }
        };

        // --- V1 TEXT CHALLENGE LOGIC (unchanged setup) ---

        function setupV1Text() {
            currentChallengeType = 'V1_TEXT';
            CHALLENGE_TEXT.textContent = 'Type the characters you see in the image.';
            v1CorrectText = randomString(6).toUpperCase();
            
            CHALLENGE_CONTENT_AREA.innerHTML = `
                <div class="v1-container">
                    <div class="v1-image-box">
                        <span style="transform: rotate(${~~(Math.random()*10 - 5)}deg);">${v1CorrectText.split('').join(' ')}</span>
                        <div style="position:absolute; top:30%; left:10%; width:100px; height:2px; background:rgba(0,0,0,0.5); transform:rotate(${~~(Math.random()*20 - 10)}deg);"></div>
                        <div style="position:absolute; bottom:20%; right:15%; width:80px; height:2px; background:rgba(0,0,0,0.5); transform:rotate(${~~(Math.random()*20 - 10)}deg);"></div>
                    </div>
                    <input type="text" id="v1-input" class="v1-input" placeholder="Enter characters">
                </div>
            `;
            document.getElementById('v1-input').focus();
        }

        function verifyV1Text() {
            const userInput = document.getElementById('v1-input').value.toUpperCase();
            if (userInput === v1CorrectText) {
                passChallenge();
            } else {
                failChallenge("Incorrect input. Please try again.");
                setupV1Text(); 
            }
        }
        
        // --- V3 CHALLENGE LOGIC (mostly unchanged) ---

        function resetGridState() {
            sequenceClicks = [];
            correctIndices = [];
            rotationalStates = [];
            CHALLENGE_CONTENT_AREA.innerHTML = '<div class="image-grid" id="image-grid"></div>';
        }

        function createGridItem(index, content, style = '') {
            const item = document.createElement('div');
            item.classList.add('grid-item');
            item.setAttribute('data-index', index);
            item.style.cssText = style;
            item.innerHTML = content;
            return item;
        }

        function verifyV3Grid() {
            const gridContainer = document.getElementById('image-grid');
            if (!gridContainer) return;

            const selectedElements = Array.from(gridContainer.querySelectorAll('.grid-item.selected'));
            const userSelectionIndices = selectedElements.map(el => parseInt(el.getAttribute('data-index'), 10)).sort((a, b) => a - b);

            const isCorrect = userSelectionIndices.length === correctIndices.length &&
                              userSelectionIndices.every((val, index) => val === correctIndices[index]);

            if (isCorrect) {
                passChallenge();
            } else {
                failChallenge("Verification failed. Incorrect tiles selected.");
                gridContainer.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
            }
        }

        function setupV3GridMatch() {
            currentChallengeType = 'V3_GRID_MATCH';
            resetGridState();
            const gridContainer = document.getElementById('image-grid');
            
            const targetItem = CHALLENGE_ITEMS[Math.floor(Math.random() * CHALLENGE_ITEMS.length)];
            const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            const wrongColor = COLORS.find(c => c !== targetColor) || COLORS[0];
            const numCorrect = Math.floor(Math.random() * 3) + 2; 

            CHALLENGE_TEXT.innerHTML = `Select all squares containing **${targetItem}** on a 
                                        <span style="color: ${targetColor}; font-weight: 700;">colored background</span>.`;
            
            let allIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            for (let i = allIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
            }
            correctIndices = allIndices.slice(0, numCorrect).sort((a, b) => a - b);

            for (let i = 0; i < 9; i++) {
                const isCorrect = correctIndices.includes(i);
                let itemContent = isCorrect ? targetItem : CHALLENGE_ITEMS[Math.floor(Math.random() * CHALLENGE_ITEMS.length)];
                
                const itemColor = isCorrect ? targetColor : (Math.random() < 0.5 ? wrongColor : targetColor);
                if (!isCorrect && itemColor === targetColor) {
                     itemContent = CHALLENGE_ITEMS.filter(item => item !== targetItem)[Math.floor(Math.random() * (CHALLENGE_ITEMS.length - 1))];
                }

                const item = createGridItem(i, itemContent, `background-color: ${itemColor};`);
                item.onclick = () => item.classList.toggle('selected');
                gridContainer.appendChild(item);
            }
        }

        function setupV3SequenceClick() {
            currentChallengeType = 'V3_SEQUENCE_CLICK';
            resetGridState();
            const gridContainer = document.getElementById('image-grid');

            CHALLENGE_TEXT.textContent = 'Click the numbers in strictly ascending order: 1, 2, 3...';
            
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            numbers.sort(() => Math.random() - 0.5); 

            for (let i = 0; i < 9; i++) {
                const num = numbers[i];
                const item = createGridItem(i, num, `background-color: #3b82f6; font-weight: bold;`);
                item.onclick = () => handleSequenceClick(item, num);
                gridContainer.appendChild(item);
            }
        }

        function handleSequenceClick(item, num) {
            const nextNumber = sequenceClicks.length + 1;

            if (num === nextNumber) {
                sequenceClicks.push(num);
                item.classList.add('checked'); 
                item.onclick = null; 
                hideStatusInPopup();

                if (sequenceClicks.length === 9) {
                    passChallenge();
                }
            } else {
                failChallenge("Incorrect! Sequence broken. Restarting challenge.");
                setTimeout(setupV3SequenceClick, 500);
            }
        }

        function setupV3SwapPuzzle() {
            currentChallengeType = 'V3_SWAP_PUZZLE';
            resetGridState();
            const gridContainer = document.getElementById('image-grid');
            
            CHALLENGE_TEXT.textContent = 'Swap tiles to arrange the sequence 1, 2, 3, 4, 5, 6, 7, 8, 9.';

            let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            tiles.sort(() => Math.random() - 0.5); 

            for (let i = 0; i < 9; i++) {
                const item = createGridItem(i, tiles[i], `background-color: #6b7280; font-weight: bold;`);
                item.setAttribute('data-value', tiles[i]);
                item.onclick = () => handleSwapClick(item);
                gridContainer.appendChild(item);
            }
            correctIndices = []; 
        }
        
        function handleSwapClick(item) {
            const swapClicks = Array.from(document.querySelectorAll('.grid-item.selected'));
            
            if (swapClicks.length === 0) {
                item.classList.add('selected');
                hideStatusInPopup();
            } else if (swapClicks.length === 1 && swapClicks[0] !== item) {
                const item1 = swapClicks[0];
                const value1 = item1.getAttribute('data-value');
                const value2 = item.getAttribute('data-value');
                
                item1.setAttribute('data-value', value2);
                item1.innerHTML = value2;
                item.setAttribute('data-value', value1);
                item.innerHTML = value1;

                item1.classList.remove('selected');
                item.classList.remove('selected');
            } else if (swapClicks.length === 1 && swapClicks[0] === item) {
                item.classList.remove('selected');
            }
        }

        function verifyV3SwapPuzzle() {
            const gridContainer = document.getElementById('image-grid');
            const tiles = Array.from(gridContainer.querySelectorAll('.grid-item'));
            const isCorrect = tiles.every((tile, index) => parseInt(tile.getAttribute('data-value')) === index + 1);

            if (isCorrect) {
                passChallenge();
            } else {
                failChallenge("Verification failed. Tiles are not in ascending order.");
            }
        }

        function setupV3RotationalPuzzle() {
            currentChallengeType = 'V3_ROTATIONAL_PUZZLE';
            resetGridState();
            const gridContainer = document.getElementById('image-grid');

            CHALLENGE_TEXT.textContent = 'Click tiles to rotate them and complete the blue pattern.';
            rotationalStates = Array(9).fill(0);
            
            for (let i = 0; i < 9; i++) {
                const item = createGridItem(i, '', 'padding-top: 100%;'); 
                
                const svgContent = `
                    <div class="rotate-content" data-rotation="0">
                      <img src="https://i.imgur.com/4M0WLlf.png" alt="Tile Image">  
                    </div>
                `;
                item.innerHTML = svgContent;
                item.onclick = () => handleRotationClick(item);
                gridContainer.appendChild(item);
            }
            
            gridContainer.querySelectorAll('.grid-item').forEach((item, index) => {
                const numRotations = Math.floor(Math.random() * 4); 
                rotationalStates[index] = numRotations;
                item.querySelector('.rotate-content').setAttribute('data-rotation', numRotations * 90);
                item.querySelector('.rotate-content').style.transform = `rotate(${numRotations * 90}deg)`;
            });
        }
        
        function handleRotationClick(item) {
            const index = parseInt(item.getAttribute('data-index'));
            const content = item.querySelector('.rotate-content');
            
            rotationalStates[index] = (rotationalStates[index] + 1) % 4;
            const degrees = rotationalStates[index] * 90;

            content.style.transform = `rotate(${degrees}deg)`;
            content.setAttribute('data-rotation', degrees);
            
            hideStatusInPopup();
        }

        function verifyV3RotationalPuzzle() {
            const isCorrect = rotationalStates.every(state => state === 0);

            if (isCorrect) {
                passChallenge();
            } else {
                failChallenge("Verification failed. The pattern is incomplete.");
            }
        }

        function setupV3PathDrawing() {
            currentChallengeType = 'V3_PATH_DRAWING';
            resetGridState();
            const gridContainer = document.getElementById('image-grid');

            CHALLENGE_TEXT.textContent = 'Click all squares that contain a diagonal line.';
            correctIndices = []; 

            for (let i = 0; i < 9; i++) {
                const hasDiagonal = Math.random() < 0.4; 
                
                let svgContent = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#f59e0b" stroke-width="10">`;

                if (hasDiagonal) {
                    correctIndices.push(i);
                    if (Math.random() < 0.5) {
                        svgContent += `<line x1="10" y1="10" x2="90" y2="90" stroke-linecap="round"/>`;
                    } else {
                        svgContent += `<line x1="90" y1="10" x2="10" y2="90" stroke-linecap="round"/>`;
                    }
                } else {
                    if (Math.random() < 0.5) {
                        svgContent += `<line x1="10" y1="50" x2="90" y2="50" stroke-linecap="round"/>`;
                    } else {
                        svgContent += `<line x1="50" y1="10" x2="50" y2="90" stroke-linecap="round"/>`;
                    }
                }
                svgContent += '</svg>';
                
                const item = createGridItem(i, svgContent, `background-color: #374151;`);
                item.onclick = () => item.classList.toggle('selected');
                gridContainer.appendChild(item);
            }
        }
        
        function verifyV3PathDrawing() {
             verifyV3Grid();
        }

        // --- MAIN CONTROL FLOW ---

        function passChallenge(token = 'CAPTCHA_SUCCESS_TOKEN_' + randomString(12)) {
            CHALLENGE_BOX.style.display = 'none';
            isVerified = true;
            CHECKBOX.classList.add('checked');
            showModal("Verification Successful!", 'success');
            
            // Resolve the Promise with the token if the handler exists
            if (resolveVerification) {
                resolveVerification(token);
                resolveVerification = rejectVerification = null; // Clear promise handlers
            }
        }

        function failChallenge(message) {
            showStatusInPopup(message, 'error');
            
            // Reject the Promise if the handler exists (e.g., V1 text failed)
            if (rejectVerification) {
                rejectVerification('CHALLENGE_FAILED');
                // Don't clear handlers here; wait for next attempt to resolve/reject
            }
        }

        function generateChallenge() {
            hideStatusInPopup();
            
            const v1Challenges = ['V1_TEXT'];
            const v3Challenges = ['V3_GRID_MATCH', 'V3_SEQUENCE_CLICK', 'V3_SWAP_PUZZLE', 'V3_PATH_DRAWING', 'V3_ROTATIONAL_PUZZLE'];
            
            currentVersion = Math.random() < 0.25 ? 'V1' : 'V3';
            VERSION_DISPLAY.textContent = currentVersion;

            let challengeToRun;
            if (currentVersion === 'V1') {
                challengeToRun = v1Challenges[Math.floor(Math.random() * v1Challenges.length)];
            } else { 
                challengeToRun = v3Challenges[Math.floor(Math.random() * v3Challenges.length)];
            }
            
            if (CHALLENGE_HANDLERS[challengeToRun]) {
                CHALLENGE_HANDLERS[challengeToRun].setup();
            } else {
                CHALLENGE_TEXT.textContent = "Error: Challenge not found.";
            }
            
            const verifyButton = document.querySelector('.verify-button');
            if (challengeToRun === 'V3_SEQUENCE_CLICK') {
                verifyButton.style.display = 'none';
            } else {
                verifyButton.style.display = 'block';
            }
            
            currentChallengeType = challengeToRun;
            CHALLENGE_BOX.style.display = 'flex';
        }

        function verifyChallenge() {
            if (currentChallengeType === 'V3_SEQUENCE_CLICK') return; 

            const handler = CHALLENGE_HANDLERS[currentChallengeType];
            if (handler && handler.verify) {
                handler.verify();
            } else {
                failChallenge("Error: Verification logic not found.");
            }
        }

        // --- Simulated Embedder Logic on Page Load ---
        
        // This function simulates the website/embedder trying to run the CAPTCHA
        async function runEmbedderSimulation() {
            logToEmbedder("Embedder is attempting to authenticate user...", 'info');
            
            // Since the user clicks the checkbox to initiate, we wait for that click.
            try {
                // The main API call: initiateCaptcha()
                const token = await initiateCaptcha();
                
                // This block executes ONLY if the user successfully verifies
                logToEmbedder("--------------------------------------------------", 'info');
                logToEmbedder("BACKEND RESPONSE SIMULATION:", 'success');
                logToEmbedder(`Token: ${token}`, 'success');
                logToEmbedder("Backend successfully validated user. Proceeding...", 'success');
                logToEmbedder("--------------------------------------------------", 'info');
                
            } catch (error) {
                // This block executes if verification fails (e.g., V1 wrong input)
                logToEmbedder("--------------------------------------------------", 'error');
                logToEmbedder(`User failed verification: ${error}`, 'error');
                logToEmbedder("Access denied.", 'error');
                logToEmbedder("--------------------------------------------------", 'error');
            }
        }
        
        // Auto-run the simulation on load, instructing the user to click the box.
        window.onload = () => {
             logToEmbedder("Embedder API loaded. Click the checkbox to start verification.", 'info');
        };
        
        // --- EXTERNAL "IMPORT" SIMULATION ---
// Imagine this is imported from another file: import { ExternalLogger } from './utils.js';
const ExternalLogger = {
    /**
     * This is your "API Output" for external uses.
     * @param {string} status - 'PASS' or 'FAIL'
     * @param {string} token - The generated security token
     */
    log: function(status, token) {
        const timestamp = new Date().toISOString();
        console.log(`%c[EXTERNAL API OUTPUT]`, 'color: #3b82f6; font-weight: bold;', {
            status: status,
            token: token,
            time: timestamp
        });
        
        // This is where you'd link other external functions
        // e.g., myGame.start() or myForm.submit()
    }
};

// --- UPDATED CONTROL FLOW ---

function passChallenge(token = 'CAPTCHA_SUCCESS_TOKEN_' + randomString(12)) {
    CHALLENGE_BOX.style.display = 'none';
    isVerified = true;
    CHECKBOX.classList.add('checked');
    showModal("Verification Successful!", 'success');
    
    // --- THE EXPORT ---
    ExternalLogger.log('PASS', token); 
    
    if (resolveVerification) {
        resolveVerification(token);
        resolveVerification = rejectVerification = null;
    }
}

function failChallenge(message) {
    showStatusInPopup(message, 'error');
    
    // --- THE EXPORT ---
    // We pass 'FAIL' and a null token to the external listener
    ExternalLogger.log('FAIL', null);

    if (rejectVerification) {
        rejectVerification('CHALLENGE_FAILED');
    }
}
        
        
        
        
        
        
    

