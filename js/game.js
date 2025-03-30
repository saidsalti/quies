class QuizGame {
    constructor() {
        this.participants = [];
        this.currentQuestion = 0;
        this.currentParticipant = 0;
        this.scores = {};
        this.timePerQuestion = 20; // seconds
        this.timer = null;
        this.timeLeft = 0;
        this.gameState = 'registration'; // 'registration', 'quiz', 'results'

        // PIXI objects
        this.app = null;
        this.registrationScreen = null;
        this.quizScreen = null;
        this.resultsScreen = null;

        // Add sound properties
        this.sounds = {};
        this.bgMusic = null;
        this.soundEnabled = false; // Track if sound is available
        this.showCorrectAnswer = false; // Ensure this is false by default
        this.confettiSprites = []; // For celebration effects

        // Add new properties for birds and clouds
        this.birds = [];
        this.clouds = [];

        // Add properties for question management
        this.allQuestions = []; // Will hold all questions from all categories
        this.usedQuestionIds = []; // Will track used questions
        this.categories = []; // Will hold category information

        // Update question count per player
        this.questionsPerPlayer = 7;
        this.currentPlayerQuestions = 0;

        // Evening sky colors
        this.skyColors = {
            top: 0x1a4580,     // Darker blue at top
            middle: 0x4a6baf,   // Mid blue
            horizon: 0xf08a4b,  // Orange sunset glow
            sun: 0xffd700       // Golden sun
        };

        // Try to load used questions from sessionStorage
        this.loadUsedQuestionsFromSession();
    }

    // Load used questions from sessionStorage
    loadUsedQuestionsFromSession() {
        try {
            const storedQuestions = sessionStorage.getItem('usedQuestionIds');
            if (storedQuestions) {
                this.usedQuestionIds = JSON.parse(storedQuestions);
                console.log(`Loaded ${this.usedQuestionIds.length} used questions from session storage`);
            }
        } catch (error) {
            console.warn("Error loading used questions from session storage:", error);
            this.usedQuestionIds = [];
        }
    }

    // Save used questions to sessionStorage
    saveUsedQuestionsToSession() {
        try {
            sessionStorage.setItem('usedQuestionIds', JSON.stringify(this.usedQuestionIds));
        } catch (error) {
            console.warn("Error saving used questions to session storage:", error);
        }
    }

    initializePixi(containerId) {
        this.app = new PIXI.Application({
            width: 800,
            height: 600,
            backgroundColor: 0x1099bb,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true
        });

        const container = document.getElementById(containerId);
        if (container) {
            container.appendChild(this.app.view);
        } else {
            console.error(`Container with ID '${containerId}' not found!`);
            document.body.appendChild(this.app.view);
        }

        // Check if sound is available and load sounds
        this.checkSoundAvailability();

        // Load questions first
        this.loadQuestions();
    }

    checkSoundAvailability() {
        // Check if PIXI.sound is available
        if (window.PIXI && PIXI.sound) {
            this.soundEnabled = true;
            // Delay sound loading to ensure proper initialization
            setTimeout(() => {
                this.loadSounds();
            }, 500);
            console.log("Sound module loaded successfully");
        } else {
            this.soundEnabled = false;
            console.warn("PIXI Sound module not available. Game will run without sound.");
        }
    }

    loadSounds() {
        // Only load sounds if sound is enabled
        if (!this.soundEnabled) return;

        try {
            const sounds = {
                click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
                correct: 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3',
                wrong: 'https://assets.mixkit.co/active_storage/sfx/2/2-preview.mp3',
                timer: 'https://assets.mixkit.co/active_storage/sfx/1407/1407-preview.mp3',
                win: 'https://assets.mixkit.co/active_storage/sfx/149/149-preview.mp3',
                type: 'https://assets.mixkit.co/active_storage/sfx/2520/2520-preview.mp3'
            };

            for (const [name, url] of Object.entries(sounds)) {
                try {
                    this.sounds[name] = PIXI.sound.Sound.from({
                        url: url,
                        preload: true,
                        loaded: (err, sound) => {
                            if (err) {
                                console.warn(`Error loading sound "${name}":`, err);
                            } else {
                                console.log(`Sound "${name}" loaded successfully`);
                            }
                        }
                    });
                } catch (error) {
                    console.warn(`Error creating sound "${name}":`, error);
                }
            }

            try {
                this.bgMusic = PIXI.sound.Sound.from({
                    url: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3',
                    preload: true,
                    loaded: (err, sound) => {
                        if (err) {
                            console.warn("Error loading background music:", err);
                        } else {
                            if (sound) {
                                this.bgMusic = sound;
                                this.bgMusic.loop = true;
                                this.bgMusic.volume = 0.4;
                                this.playSound('bgMusic');
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn("Error creating background music:", error);
            }
        } catch (error) {
            console.error("Error in loadSounds:", error);
            this.soundEnabled = false;
        }
    }

    playSound(soundName, options = {}) {
        if (!this.soundEnabled) return;

        try {
            if (soundName === 'bgMusic' && this.bgMusic) {
                if (this.bgMusic.isPlaying) {
                    return;
                }
                this.bgMusic.play({
                    loop: true,
                    volume: 0.4,
                    ...options
                });
            } else if (this.sounds[soundName]) {
                const sound = this.sounds[soundName];
                if (sound && sound.isLoaded) {
                    sound.play(options);
                }
            }
        } catch (error) {
            console.warn(`Error playing sound ${soundName}:`, error);
        }
    }

    stopSound(soundName) {
        if (!this.soundEnabled) return;

        try {
            if (soundName === 'bgMusic' && this.bgMusic) {
                if (this.bgMusic.isPlaying) {
                    this.bgMusic.stop();
                }
            } else if (this.sounds[soundName] && this.sounds[soundName].isPlaying) {
                this.sounds[soundName].stop();
            }
        } catch (error) {
            console.warn(`Error stopping sound ${soundName}:`, error);
        }
    }

    stopAllSounds() {
        if (!this.soundEnabled) return;

        try {
            for (const soundName in this.sounds) {
                if (this.sounds[soundName] && this.sounds[soundName].isPlaying) {
                    this.sounds[soundName].stop();
                }
            }

            if (this.bgMusic && this.bgMusic.isPlaying) {
                this.bgMusic.stop();
            }

            PIXI.sound.stopAll();
        } catch (error) {
            console.warn("Error stopping all sounds:", error);
        }
    }

    loadQuestions() {
        fetch('data/questions.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                this.categories = data.categories;

                this.allQuestions = [];
                this.categories.forEach((category, categoryIndex) => {
                    category.questions.forEach((question, questionIndex) => {
                        const questionId = `cat${categoryIndex}_q${questionIndex}`;
                        this.allQuestions.push({
                            ...question,
                            id: questionId,
                            category: category.name
                        });
                    });
                });

                console.log(`Loaded ${this.allQuestions.length} questions from ${this.categories.length} categories`);

                this.createRegistrationScreen();
            })
            .catch(error => {
                console.error('Error loading questions:', error);
                this.allQuestions = quizQuestions.map((q, i) => ({
                    ...q,
                    id: `default_${i}`,
                    category: 'أسئلة عامة'
                }));
                this.createRegistrationScreen();
            });
    }

    createRegistrationScreen() {
        this.registrationScreen = new PIXI.Container();
        this.app.stage.addChild(this.registrationScreen);

        const bg = new PIXI.Graphics();
        bg.beginFill(0x1099bb);
        bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        bg.endFill();

        for (let i = 0; i < 100; i++) {
            const circle = new PIXI.Graphics();
            circle.beginFill(0xFFFFFF, 0.1);
            const size = Math.random() * 20 + 5;
            circle.drawCircle(0, 0, size);
            circle.endFill();
            circle.x = Math.random() * this.app.screen.width;
            circle.y = Math.random() * this.app.screen.height;
            bg.addChild(circle);
        }

        this.registrationScreen.addChild(bg);

        const frame = new PIXI.Graphics();
        frame.lineStyle(4, 0xFFFFFF, 0.8);
        frame.drawRoundedRect(20, 20, this.app.screen.width - 40, this.app.screen.height - 40, 15);
        this.registrationScreen.addChild(frame);

        const title = new PIXI.Text('تسجيل المتسابقين', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 'white',
            align: 'center'
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 50;
        this.registrationScreen.addChild(title);

        this.participantListContainer = new PIXI.Container();
        this.participantListContainer.x = 100;
        this.participantListContainer.y = 100;
        this.registrationScreen.addChild(this.participantListContainer);

        const inputBg = new PIXI.Graphics();
        inputBg.beginFill(0xFFFFFF);
        inputBg.drawRoundedRect(100, 350, 600, 40, 5);
        inputBg.endFill();
        this.registrationScreen.addChild(inputBg);

        this.inputText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 'black'
        });
        this.inputText.x = 110;
        this.inputText.y = 360;
        this.registrationScreen.addChild(this.inputText);

        const addButton = new PIXI.Graphics();
        addButton.beginFill(0x4CAF50);
        addButton.drawRoundedRect(100, 400, 200, 50, 10);
        addButton.endFill();

        addButton.eventMode = 'static';
        addButton.cursor = 'pointer';

        addButton.on('pointerover', () => {
            addButton.tint = 0x66BB6A;
        });

        addButton.on('pointerout', () => {
            addButton.tint = 0xFFFFFF;
        });

        addButton.on('pointerdown', () => {
            this.playSound('click');
            this.addParticipant();
        });
        this.registrationScreen.addChild(addButton);

        const addButtonText = new PIXI.Text('إضافة متسابق', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 'white'
        });
        addButtonText.anchor.set(0.5);
        addButtonText.x = 200;
        addButtonText.y = 425;
        this.registrationScreen.addChild(addButtonText);

        const startButton = new PIXI.Graphics();
        startButton.beginFill(0x2196F3);
        startButton.drawRoundedRect(500, 400, 200, 50, 10);
        startButton.endFill();

        startButton.eventMode = 'static';
        startButton.cursor = 'pointer';

        startButton.on('pointerover', () => {
            startButton.tint = 0x64B5F6;
        });

        startButton.on('pointerout', () => {
            startButton.tint = 0xFFFFFF;
        });

        startButton.on('pointerdown', () => {
            this.playSound('click');
            this.startQuiz();
        });
        this.registrationScreen.addChild(startButton);

        const startButtonText = new PIXI.Text('بدء المسابقة', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 'white'
        });
        startButtonText.anchor.set(0.5);
        startButtonText.x = 600;
        startButtonText.y = 425;
        this.registrationScreen.addChild(startButtonText);

        const inputInstructions = new PIXI.Text('اكتب اسم المتسابق ثم اضغط على زر "إضافة متسابق" أو اضغط Enter', {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 'white'
        });
        inputInstructions.x = 100;
        inputInstructions.y = 330;
        this.registrationScreen.addChild(inputInstructions);

        inputBg.eventMode = 'static';
        inputBg.cursor = 'text';
        inputBg.on('pointerdown', () => {
            inputBg.tint = 0xE3F2FD;

            if (!this.cursorBlink) {
                this.cursorBlink = true;
                this.cursor = new PIXI.Text('|', {
                    fontFamily: 'Arial',
                    fontSize: 18,
                    fill: 'black'
                });
                this.cursor.x = this.inputText.x + this.inputText.width + 2;
                this.cursor.y = this.inputText.y;
                this.registrationScreen.addChild(this.cursor);

                let visible = true;
                this.cursorInterval = setInterval(() => {
                    this.cursor.visible = visible = !visible;
                }, 500);
            }
        });

        window.addEventListener('keydown', this.handleKeyDown.bind(this));

        this.updateParticipantList();
    }

    handleKeyDown(event) {
        if (this.gameState !== 'registration') return;

        if (event.key === 'Enter') {
            this.playSound('click');
            this.addParticipant();
            return;
        }

        if (event.key === 'Backspace') {
            this.inputText.text = this.inputText.text.slice(0, -1);

            if (this.cursor) {
                this.cursor.x = this.inputText.x + this.inputText.width + 2;
            }
            return;
        }

        if (event.key.length === 1) {
            this.playSound('type', { volume: 0.2 });
            this.inputText.text += event.key;

            if (this.cursor) {
                this.cursor.x = this.inputText.x + this.inputText.width + 2;
            }
        }
    }

    addParticipant() {
        const name = this.inputText.text.trim();
        if (name) {
            this.participants.push(name);
            this.scores[name] = 0;
            this.inputText.text = '';

            if (this.cursor) {
                this.cursor.x = this.inputText.x + 2;
            }

            this.showNotification(`تم إضافة المتسابق: ${name}`);

            this.updateParticipantList();
        }
    }

    showNotification(message) {
        if (this.notification) {
            this.registrationScreen.removeChild(this.notification);
        }

        this.notification = new PIXI.Text(message, {
            fontFamily: 'Arial',
            fontSize: 16,
            fill: 'lightgreen'
        });
        this.notification.x = 100;
        this.notification.y = 460;
        this.registrationScreen.addChild(this.notification);

        setTimeout(() => {
            if (this.notification && this.notification.parent) {
                this.notification.parent.removeChild(this.notification);
                this.notification = null;
            }
        }, 2000);
    }

    updateParticipantList() {
        while (this.participantListContainer.children.length > 0) {
            this.participantListContainer.removeChildAt(0);
        }

        this.participants.forEach((name, index) => {
            const text = new PIXI.Text(`${index + 1}. ${name}`, {
                fontFamily: 'Arial',
                fontSize: 18,
                fill: 'white'
            });
            text.y = index * 30;
            this.participantListContainer.addChild(text);
        });
    }

    startQuiz() {
        if (this.participants.length < 2) {
            alert('يجب إضافة متسابقين اثنين على الأقل!');
            return;
        }

        this.cleanup();
        this.gameState = 'quiz';
        this.createQuizScreen();
        this.registrationScreen.visible = false;
        this.quizScreen.visible = true;
        this.loadQuestion();
    }

    drawStar(graphics, x, y, points, outerRadius, innerRadius) {
        const step = Math.PI * 2 / points;
        const halfStep = step / 2;
        const start = -Math.PI / 2;

        graphics.moveTo(
            x + Math.cos(start) * outerRadius,
            y + Math.sin(start) * outerRadius
        );

        for (let i = 1; i <= points * 2; i++) {
            const angle = start + (i * halfStep);
            const radius = i % 2 === 0 ? outerRadius : innerRadius;

            graphics.lineTo(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius
            );
        }
    }

    createBirds() {
        for (let i = 0; i < 6; i++) {
            const bird = new PIXI.Container();

            // Bird body
            const body = new PIXI.Graphics();
            body.beginFill(i % 2 === 0 ? 0x333333 : 0x555555);
            body.drawEllipse(0, 0, 12, 6);
            body.endFill();
            bird.addChild(body);

            // Bird wings - used for animation
            const leftWing = new PIXI.Graphics();
            leftWing.beginFill(i % 2 === 0 ? 0x333333 : 0x555555);
            leftWing.drawEllipse(-10, 0, 8, 3);
            leftWing.endFill();
            bird.addChild(leftWing);

            const rightWing = new PIXI.Graphics();
            rightWing.beginFill(i % 2 === 0 ? 0x333333 : 0x555555);
            rightWing.drawEllipse(10, 0, 8, 3);
            rightWing.endFill();
            bird.addChild(rightWing);

            // Position bird
            bird.x = Math.random() * this.app.screen.width;
            bird.y = 60 + Math.random() * 100;

            // Animation properties
            bird.vx = 0.5 + Math.random() * 1;
            bird.wingsUp = false;
            bird.wingSpeed = 0.1 + Math.random() * 0.2;
            bird.wingTimer = 0;
            bird.scale.set(0.6 + Math.random() * 0.4);

            this.birds.push({
                container: bird,
                leftWing,
                rightWing,
                wingTimer: 0,
                wingsUp: false
            });

            this.cloudsLayer.addChild(bird);
        }
    }

    createQuizScreen() {
        this.quizScreen = new PIXI.Container();
        this.app.stage.addChild(this.quizScreen);

        // Create multiple layers to control visibility
        this.backgroundLayer = new PIXI.Container(); // Bottom layer (sky, mountains)
        this.cloudsLayer = new PIXI.Container();     // Middle layer (clouds, birds)
        this.uiLayer = new PIXI.Container();         // Top layer (quiz UI)
        
        this.quizScreen.addChild(this.backgroundLayer);
        this.quizScreen.addChild(this.cloudsLayer);
        this.quizScreen.addChild(this.uiLayer);

        // Background sky with gradient
        const bg = new PIXI.Graphics();
        for (let i = 0; i < this.app.screen.height; i++) {
            let ratio = i / this.app.screen.height;
            let color;

            if (ratio < 0.4) {
                color = this.skyColors.top;
            } else if (ratio < 0.65) {
                const t = (ratio - 0.4) / 0.25;
                color = this.lerpColor(this.skyColors.top, this.skyColors.middle, t);
            } else if (ratio < 0.8) {
                const t = (ratio - 0.65) / 0.15;
                color = this.lerpColor(this.skyColors.middle, this.skyColors.horizon, t);
            } else {
                color = this.skyColors.horizon;
            }

            bg.beginFill(color);
            bg.drawRect(0, i, this.app.screen.width, 1);
            bg.endFill();
        }
        this.backgroundLayer.addChild(bg);

        // Add mountains to background layer
        this.createMountains();

        // Ground at bottom
        const ground = new PIXI.Graphics();
        ground.beginFill(0x338833);
        ground.drawRect(0, this.app.screen.height - 50, this.app.screen.width, 50);
        ground.endFill();
        this.backgroundLayer.addChild(ground);

        // Add setting sun to background
        const sun = new PIXI.Graphics();
        sun.beginFill(this.skyColors.sun);
        sun.drawCircle(0, 0, 50);
        sun.endFill();

        const innerSun = new PIXI.Graphics();
        innerSun.beginFill(0xFFFFFF, 0.7);
        innerSun.drawCircle(0, 0, 30);
        innerSun.endFill();
        sun.addChild(innerSun);

        sun.x = this.app.screen.width * 0.25;
        sun.y = this.app.screen.height * 0.75;
        this.backgroundLayer.addChild(sun);

        for (let i = 0; i < 12; i++) {
            const ray = new PIXI.Graphics();
            ray.beginFill(0xffdd44, 0.4);
            ray.drawRect(-2, -80, 4, 65);
            ray.endFill();
            ray.rotation = i * Math.PI / 6;
            sun.addChild(ray);

            this.app.ticker.add((delta) => {
                ray.rotation += 0.001 * delta;
            });
        }

        // Create clouds and birds in middle layer
        this.createClouds();
        this.createBirds();

        // Add stars to background
        for (let i = 0; i < 50; i++) {
            const star = new PIXI.Graphics();
            const opacity = Math.random() * 0.4 + 0.1;
            star.beginFill(0xFFFFFF, opacity);
            const size = Math.random() * 2 + 1;
            this.drawStar(star, 0, 0, 5, size, size / 2);
            star.endFill();
            star.x = Math.random() * this.app.screen.width;
            star.y = Math.random() * (this.app.screen.height * 0.5);
            this.backgroundLayer.addChild(star);
        }

        // UI elements in top layer
        const uiPanel = new PIXI.Graphics();
        uiPanel.beginFill(0x000000, 0.5);
        uiPanel.drawRoundedRect(15, 15, this.app.screen.width - 30, this.app.screen.height - 30, 15);
        uiPanel.endFill();
        this.uiLayer.addChild(uiPanel);

        const quizFrame = new PIXI.Graphics();
        quizFrame.lineStyle(4, 0xFFFFFF, 0.8);
        quizFrame.drawRoundedRect(20, 20, this.app.screen.width - 40, this.app.screen.height - 40, 15);
        this.uiLayer.addChild(quizFrame);

        const title = new PIXI.Text('المسابقة', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 'white',
            align: 'center',
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 4
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 30;
        this.uiLayer.addChild(title);

        this.participantName = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'white',
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 3
        });
        this.participantName.anchor.set(0.5);
        this.participantName.x = this.app.screen.width / 2;
        this.participantName.y = 70;
        this.uiLayer.addChild(this.participantName);

        this.timerText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'white',
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 3
        });
        this.timerText.anchor.set(0.5);
        this.timerText.x = this.app.screen.width / 2;
        this.timerText.y = 110;
        this.uiLayer.addChild(this.timerText);

        this.categoryText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 'white',
            align: 'center',
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 3
        });
        this.categoryText.anchor.set(0.5);
        this.categoryText.x = this.app.screen.width / 2;
        this.categoryText.y = 140;
        this.uiLayer.addChild(this.categoryText);

        const questionBg = new PIXI.Graphics();
        questionBg.beginFill(0x000000, 0.7);
        questionBg.drawRoundedRect(50, 170, this.app.screen.width - 100, 90, 10);
        questionBg.endFill();
        this.uiLayer.addChild(questionBg);
        
        const questionBox = new PIXI.Graphics();
        questionBox.beginFill(0xFFFFFF, 0.95);
        questionBox.drawRoundedRect(55, 175, this.app.screen.width - 110, 80, 10);
        questionBox.endFill();
        this.uiLayer.addChild(questionBox);

        this.questionText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'black',
            align: 'center',
            fontWeight: 'bold',
            wordWrap: true,
            wordWrapWidth: this.app.screen.width - 130
        });
        this.questionText.anchor.set(0.5, 0.5);
        this.questionText.x = this.app.screen.width / 2;
        this.questionText.y = 215;
        this.uiLayer.addChild(this.questionText);

        this.optionButtons = [];
        for (let i = 0; i < 4; i++) {
            const shadow = new PIXI.Graphics();
            shadow.beginFill(0x000000, 0.3);
            shadow.drawRoundedRect(104, 254 + i * 70, 600, 50, 10);
            shadow.endFill();
            this.uiLayer.addChild(shadow);
            
            const button = new PIXI.Graphics();
            button.beginFill(0xFFFFFF, 0.95);
            button.drawRoundedRect(0, 0, 600, 50, 10);
            button.endFill();
            button.x = 100;
            button.y = 250 + i * 70;

            button.eventMode = 'static';
            button.cursor = 'pointer';

            button.on('pointerover', () => {
                button.tint = 0xE3F2FD;
            });

            button.on('pointerout', () => {
                button.tint = 0xFFFFFF;
            });

            button.optionIndex = i;
            button.on('pointerdown', () => {
                this.playSound('click');
                this.checkAnswer(i);
            });

            const text = new PIXI.Text('', {
                fontFamily: 'Arial',
                fontSize: 20,
                fill: 'black',
                fontWeight: 'bold'
            });
            text.anchor.set(0, 0.5);
            text.x = 20;
            text.y = 25;

            button.addChild(text);
            this.optionButtons.push({ button, text, shadow });
            this.uiLayer.addChild(button);
        }

        this.createPlayerScoreBar();

        this.app.ticker.add(this.animateBackground.bind(this));
    }

    lerpColor(a, b, t) {
        const ar = (a >> 16) & 0xff;
        const ag = (a >> 8) & 0xff;
        const ab = a & 0xff;

        const br = (b >> 16) & 0xff;
        const bg = (b >> 8) & 0xff;
        const bb = b & 0xff;

        const rr = Math.round(ar + (br - ar) * t);
        const rg = Math.round(ag + (bg - ag) * t);
        const rb = Math.round(ab + (bb - ab) * t);

        return (rr << 16) + (rg << 8) + rb;
    }

    createPlayerScoreBar() {
        this.playerScoreBar = new PIXI.Container();
        this.playerScoreBar.y = this.app.screen.height - 40;
        this.uiLayer.addChild(this.playerScoreBar);

        const barBg = new PIXI.Graphics();
        barBg.beginFill(0x000000, 0.7);
        barBg.drawRoundedRect(0, 0, this.app.screen.width, 30, 5);
        barBg.endFill();
        this.playerScoreBar.addChild(barBg);

        this.updatePlayerScoreBar();
    }

    updatePlayerScoreBar() {
        while (this.playerScoreBar.children.length > 1) {
            this.playerScoreBar.removeChildAt(1);
        }

        const totalWidth = this.app.screen.width - 20;
        const playerWidth = totalWidth / this.participants.length;

        this.participants.forEach((name, index) => {
            const isCurrentPlayer = index === this.currentParticipant;

            const playerBg = new PIXI.Graphics();
            if (isCurrentPlayer) {
                playerBg.beginFill(0xffdd44, 0.5);
            }
            playerBg.drawRoundedRect(0, 0, playerWidth, 24, 5);
            playerBg.endFill();
            playerBg.x = 10 + index * playerWidth;
            playerBg.y = 3;
            this.playerScoreBar.addChild(playerBg);

            const playerText = new PIXI.Text(`${name} (${this.scores[name]})`, {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: isCurrentPlayer ? '#ffffff' : '#cccccc',
                fontWeight: isCurrentPlayer ? 'bold' : 'normal'
            });
            playerText.anchor.set(0.5, 0.5);
            playerText.x = 10 + index * playerWidth + playerWidth / 2;
            playerText.y = 15;
            this.playerScoreBar.addChild(playerText);
        });
    }

    createClouds() {
        for (let i = 0; i < 6; i++) {
            const cloud = new PIXI.Container();

            const cloudType = Math.floor(Math.random() * 3);
            const cloudColor = i < 3 ? 0xFFD6A5 : 0xFFFFFF;
            const cloudAlpha = 0.6 + Math.random() * 0.4;

            if (cloudType === 0) {
                const puff = new PIXI.Graphics();
                puff.beginFill(cloudColor, cloudAlpha);
                puff.drawEllipse(0, 0, 40, 20);
                puff.endFill();
                cloud.addChild(puff);
            } else if (cloudType === 1) {
                const numPuffs = 3 + Math.floor(Math.random() * 2);
                for (let j = 0; j < numPuffs; j++) {
                    const puff = new PIXI.Graphics();
                    puff.beginFill(cloudColor, cloudAlpha);
                    puff.drawCircle(
                        j * 25,
                        Math.sin(j) * 5,
                        20 - (j === 0 || j === numPuffs - 1 ? 5 : 0)
                    );
                    puff.endFill();
                    cloud.addChild(puff);
                }
            } else {
                const baseSize = 25 + Math.random() * 10;
                const numPuffs = 4 + Math.floor(Math.random() * 3);

                const base = new PIXI.Graphics();
                base.beginFill(cloudColor, cloudAlpha);
                base.drawEllipse(numPuffs * 15 / 2, 15, numPuffs * 15 / 2, 15);
                base.endFill();
                cloud.addChild(base);

                for (let j = 0; j < numPuffs; j++) {
                    const puff = new PIXI.Graphics();
                    puff.beginFill(cloudColor, cloudAlpha);
                    puff.drawCircle(
                        j * 15,
                        0,
                        baseSize - (j % 2 === 0 ? 5 : 0)
                    );
                    puff.endFill();
                    cloud.addChild(puff);
                }
            }

            cloud.x = Math.random() * this.app.screen.width;
            cloud.y = 30 + Math.random() * (this.app.screen.height * 0.3);

            cloud.vx = 0.1 + Math.random() * 0.3;

            const scale = 0.5 + Math.random() * 1;
            cloud.scale.set(scale);

            this.clouds.push(cloud);
            this.cloudsLayer.addChild(cloud);
        }
    }

    createMountains() {
        const mountains = new PIXI.Graphics();
        mountains.beginFill(0x223322);

        mountains.moveTo(0, this.app.screen.height - 50);

        let x = 0;
        while (x < this.app.screen.width) {
            const peakHeight = Math.random() * 50 + 30;
            const width = Math.random() * 100 + 50;

            mountains.lineTo(x + width / 2, this.app.screen.height - 50 - peakHeight);
            mountains.lineTo(x + width, this.app.screen.height - 50);

            x += width;
        }

        mountains.lineTo(this.app.screen.width, this.app.screen.height - 50);
        mountains.lineTo(0, this.app.screen.height - 50);
        mountains.endFill();

        mountains.beginFill(0x112211);

        mountains.moveTo(0, this.app.screen.height - 50);

        x = -50;
        while (x < this.app.screen.width + 50) {
            const peakHeight = Math.random() * 30 + 15;
            const width = Math.random() * 120 + 80;

            mountains.lineTo(x + width / 2, this.app.screen.height - 50 - peakHeight);
            mountains.lineTo(x + width, this.app.screen.height - 50);

            x += width;
        }

        mountains.lineTo(this.app.screen.width, this.app.screen.height - 50);
        mountains.lineTo(0, this.app.screen.height - 50);
        mountains.endFill();

        this.backgroundLayer.addChild(mountains);
    }

    animateBackground(delta) {
        if (this.gameState !== 'quiz' || !this.quizScreen.visible) return;

        for (const bird of this.birds) {
            const container = bird.container;
            container.x += container.vx * delta;

            if (container.x > this.app.screen.width + 30) {
                container.x = -30;
                container.y = 60 + Math.random() * 100;
            }

            bird.wingTimer += container.wingSpeed * delta;

            if (bird.wingTimer > 1) {
                bird.wingTimer = 0;
                bird.wingsUp = !bird.wingsUp;

                if (bird.wingsUp) {
                    bird.leftWing.y = -3;
                    bird.rightWing.y = -3;
                } else {
                    bird.leftWing.y = 3;
                    bird.rightWing.y = 3;
                }
            }
        }

        for (const cloud of this.clouds) {
            cloud.x -= cloud.vx * delta;

            if (cloud.x < -100) {
                cloud.x = this.app.screen.width + 50;
                cloud.y = 30 + Math.random() * 100;
            }
        }
    }

    loadQuestion() {
        // Check if current player has completed their questions
        if (this.currentPlayerQuestions >= this.questionsPerPlayer) {
            // Reset question count and move to next player
            this.currentPlayerQuestions = 0;
            this.currentParticipant = (this.currentParticipant + 1) % this.participants.length;
        }

        // Check if all questions are used or max total questions reached
        if (this.currentQuestion >= this.questionsPerPlayer * this.participants.length ||
            this.allQuestions.length === this.usedQuestionIds.length) {
            this.showResults();
            return;
        }

        // Update display with current participant name
        this.participantName.text = `دور المتسابق: ${this.participants[this.currentParticipant]}`;
        this.updatePlayerScoreBar();

        // Find unused questions
        const unusedQuestions = this.allQuestions.filter(
            q => !this.usedQuestionIds.includes(q.id)
        );

        if (unusedQuestions.length === 0) {
            this.usedQuestionIds = [];
            this.saveUsedQuestionsToSession();
            this.loadQuestion();
            return;
        }

        // Select a random unused question
        const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
        const selectedQuestion = unusedQuestions[randomIndex];

        // Mark question as used
        this.usedQuestionIds.push(selectedQuestion.id);
        this.saveUsedQuestionsToSession();

        // Display category and question
        this.categoryText.text = `فئة السؤال: ${selectedQuestion.category}`;
        this.questionText.text = selectedQuestion.question;

        // Store current question for answer checking
        this.currentSelectedQuestion = selectedQuestion;

        // Update option buttons with answers
        for (let i = 0; i < 4; i++) {
            this.optionButtons[i].text.text = selectedQuestion.options[i];
            this.optionButtons[i].button.tint = 0xFFFFFF;
        }

        // Start timer
        this.timeLeft = this.timePerQuestion;
        this.updateTimer();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 5 && this.timeLeft > 0) {
                this.playSound('timer', { volume: 0.3 });
            }
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.timeOut();
            }
        }, 1000);

        // Increment the count of questions for current player
        this.currentPlayerQuestions++;
        
        // Update the global question counter only after each cycle of players
        if (this.currentParticipant === 0 && this.currentPlayerQuestions === 1) {
            this.currentQuestion++;
        }
        
        this.updateScores();
    }

    updateTimer() {
        this.timerText.text = `الوقت المتبقي: ${this.timeLeft} ثانية`;
        if (this.timeLeft <= 5) {
            this.timerText.style.fill = 'red';
        } else {
            this.timerText.style.fill = 'white';
        }
    }

    updateScores() {
        this.updatePlayerScoreBar();
    }

    checkAnswer(selectedIndex) {
        if (this.gameState === 'tiebreaker') {
            this.checkTiebreakerAnswer(selectedIndex);
            return;
        }
        
        clearInterval(this.timer);

        const participant = this.participants[this.currentParticipant];
        const isCorrect = selectedIndex === this.currentSelectedQuestion.correctAnswer;

        if (isCorrect) {
            this.scores[participant] += 1;
            this.playSound('correct');

            this.optionButtons[selectedIndex].button.tint = 0x9FE2BF;

            const feedbackText = new PIXI.Text("تم تسجيل الإجابة", {
                fontFamily: 'Arial',
                fontSize: 22,
                fill: 'white',
                fontWeight: 'bold'
            });
            feedbackText.anchor.set(0.5);
            feedbackText.x = this.app.screen.width / 2;
            feedbackText.y = 420;
            this.quizScreen.addChild(feedbackText);

            setTimeout(() => {
                if (feedbackText.parent) this.quizScreen.removeChild(feedbackText);
            }, 1500);
        } else {
            this.playSound('wrong');

            this.optionButtons[selectedIndex].button.tint = 0xFFB7B7;

            const feedbackText = new PIXI.Text("تم تسجيل الإجابة", {
                fontFamily: 'Arial',
                fontSize: 22,
                fill: 'white',
                fontWeight: 'bold'
            });
            feedbackText.anchor.set(0.5);
            feedbackText.x = this.app.screen.width / 2;
            feedbackText.y = 420;
            this.quizScreen.addChild(feedbackText);

            setTimeout(() => {
                if (feedbackText.parent) this.quizScreen.removeChild(feedbackText);
            }, 1500);
        }

        this.updateScores();

        setTimeout(() => {
            this.nextParticipantOrQuestion();
        }, 2000);
    }

    timeOut() {
        this.playSound('wrong');

        const timeupText = new PIXI.Text("انتهى الوقت!", {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'red',
            fontWeight: 'bold'
        });
        timeupText.anchor.set(0.5);
        timeupText.x = this.app.screen.width / 2;
        timeupText.y = 200;
        this.quizScreen.addChild(timeupText);

        setTimeout(() => {
            if (timeupText.parent) this.quizScreen.removeChild(timeupText);
            this.nextParticipantOrQuestion();
        }, 2000);
    }

    nextParticipantOrQuestion() {
        // Reset button colors
        for (const option of this.optionButtons) {
            option.button.tint = 0xFFFFFF;
        }

        // Move to next participant
        this.currentParticipant = (this.currentParticipant + 1) % this.participants.length;
        
        // If we've gone through all participants, increment the question counter
        if (this.currentParticipant === 0) {
            this.currentQuestion++;
        }
        
        // Always reset the current player's question count to ensure proper tracking
        this.currentPlayerQuestions = 0;
        
        // Load the next question
        this.loadQuestion();
    }

    showResults() {
        if (this.checkForTies()) {
            this.startTiebreaker();
            return;
        }
        
        this.gameState = 'results';
        clearInterval(this.timer);
        this.quizScreen.visible = false;
        this.createResultsScreen();

        this.playSound('win', { volume: 0.8 });

        if (this.soundEnabled) {
            this.stopSound('bgMusic');
            try {
                PIXI.sound.Sound.from({
                    url: 'https://assets.mixkit.co/active_storage/sfx/1192/1192-preview.mp3',
                    preload: true,
                    loaded: (err, sound) => {
                        if (err) {
                            console.warn("Error loading celebration music:", err);
                        } else if (sound) {
                            this.bgMusic = sound;
                            this.bgMusic.loop = true;
                            this.bgMusic.volume = 0.7;
                            this.playSound('bgMusic');
                        }
                    }
                });
            } catch (error) {
                console.warn("Error creating celebration music:", error);
            }
        }
        
        this.startFireworks();
    }

    checkForTies() {
        const scores = Object.values(this.scores);
        const highestScore = Math.max(...scores);
        const winners = this.participants.filter(name => this.scores[name] === highestScore);
        return winners.length > 1;
    }

    startTiebreaker() {
        const highestScore = Math.max(...Object.values(this.scores));
        const tiedParticipants = this.participants.filter(name => this.scores[name] === highestScore);
        
        this.tiedParticipants = tiedParticipants;
        this.currentTiebreakerRound = 1;
        this.tiebreakerScores = {};
        
        tiedParticipants.forEach(name => {
            this.tiebreakerScores[name] = 0;
        });
        
        this.showTiebreakerMessage();
    }

    showTiebreakerMessage() {
        if (this.tiebreakerMessage && this.tiebreakerMessage.parent) {
            this.tiebreakerMessage.parent.removeChild(this.tiebreakerMessage);
        }
        
        const messageContainer = new PIXI.Container();
        this.app.stage.addChild(messageContainer);
        
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000000, 0.8);
        bg.drawRoundedRect(0, 0, this.app.screen.width, this.app.screen.height, 20);
        bg.endFill();
        messageContainer.addChild(bg);
        
        const title = new PIXI.Text('التعادل!', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 'gold',
            align: 'center',
            fontWeight: 'bold'
        });
        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 150;
        messageContainer.addChild(title);
        
        const message = new PIXI.Text(`يوجد تعادل بين: ${this.tiedParticipants.join(' و ')}!\nسيتم طرح سؤال إضافي للفصل بينهم.`, {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'white',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: 600
        });
        message.anchor.set(0.5);
        message.x = this.app.screen.width / 2;
        message.y = 250;
        messageContainer.addChild(message);
        
        const button = new PIXI.Graphics();
        button.beginFill(0x4CAF50);
        button.drawRoundedRect(0, 0, 250, 60, 15);
        button.endFill();
        button.x = this.app.screen.width / 2 - 125;
        button.y = 350;
        button.eventMode = 'static';
        button.cursor = 'pointer';
        
        button.on('pointerover', () => {
            button.tint = 0x66BB6A;
        });
        
        button.on('pointerout', () => {
            button.tint = 0xFFFFFF;
        });
        
        button.on('pointerdown', () => {
            this.playSound('click');
            this.app.stage.removeChild(messageContainer);
            this.startTiebreakerQuestion();
        });
        
        messageContainer.addChild(button);
        
        const buttonText = new PIXI.Text('متابعة', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'white',
            fontWeight: 'bold'
        });
        buttonText.anchor.set(0.5);
        buttonText.x = this.app.screen.width / 2;
        buttonText.y = 380;
        messageContainer.addChild(buttonText);
        
        this.tiebreakerMessage = messageContainer;
    }

    startTiebreakerQuestion() {
        this.gameState = 'tiebreaker';
        this.currentTiebreakerParticipantIndex = 0;
        
        if (!this.quizScreen.visible) {
            this.quizScreen.visible = true;
        }
        
        this.loadTiebreakerQuestion();
    }

    loadTiebreakerQuestion() {
        if (this.currentTiebreakerParticipantIndex >= this.tiedParticipants.length) {
            this.finishTiebreakerRound();
            return;
        }
        
        const participantName = this.tiedParticipants[this.currentTiebreakerParticipantIndex];
        this.participantName.text = `دور المتسابق (كسر التعادل): ${participantName}`;
        
        const unusedQuestions = this.allQuestions.filter(
            q => !this.usedQuestionIds.includes(q.id)
        );
        
        if (unusedQuestions.length === 0) {
            this.usedQuestionIds = [];
            this.loadTiebreakerQuestion();
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
        const selectedQuestion = unusedQuestions[randomIndex];
        
        this.usedQuestionIds.push(selectedQuestion.id);
        this.saveUsedQuestionsToSession();
        
        this.categoryText.text = `فئة السؤال (كسر التعادل): ${selectedQuestion.category}`;
        this.questionText.text = selectedQuestion.question;
        this.currentSelectedQuestion = selectedQuestion;
        
        for (let i = 0; i < 4; i++) {
            this.optionButtons[i].text.text = selectedQuestion.options[i];
            this.optionButtons[i].button.tint = 0xFFFFFF;
        }
        
        this.timeLeft = this.timePerQuestion;
        this.updateTimer();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 5 && this.timeLeft > 0) {
                this.playSound('timer', { volume: 0.3 });
            }
            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.tiebreakerTimeOut();
            }
        }, 1000);
    }

    tiebreakerTimeOut() {
        this.playSound('wrong');
        
        const timeupText = new PIXI.Text("انتهى الوقت!", {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 'red',
            fontWeight: 'bold'
        });
        timeupText.anchor.set(0.5);
        timeupText.x = this.app.screen.width / 2;
        timeupText.y = 200;
        this.quizScreen.addChild(timeupText);
        
        setTimeout(() => {
            if (timeupText.parent) this.quizScreen.removeChild(timeupText);
            this.currentTiebreakerParticipantIndex++;
            this.loadTiebreakerQuestion();
        }, 2000);
    }

    checkTiebreakerAnswer(selectedIndex) {
        clearInterval(this.timer);
        
        const participant = this.tiedParticipants[this.currentTiebreakerParticipantIndex];
        const isCorrect = selectedIndex === this.currentSelectedQuestion.correctAnswer;
        
        if (isCorrect) {
            this.tiebreakerScores[participant] += 1;
            this.playSound('correct');
            this.optionButtons[selectedIndex].button.tint = 0x9FE2BF;
        } else {
            this.playSound('wrong');
            this.optionButtons[selectedIndex].button.tint = 0xFFB7B7;
        }
        
        const feedbackText = new PIXI.Text("تم تسجيل الإجابة", {
            fontFamily: 'Arial',
            fontSize: 22,
            fill: 'white',
            fontWeight: 'bold'
        });
        feedbackText.anchor.set(0.5);
        feedbackText.x = this.app.screen.width / 2;
        feedbackText.y = 420;
        this.quizScreen.addChild(feedbackText);
        
        setTimeout(() => {
            if (feedbackText.parent) this.quizScreen.removeChild(feedbackText);
            
            this.currentTiebreakerParticipantIndex++;
            this.loadTiebreakerQuestion();
        }, 2000);
    }

    finishTiebreakerRound() {
        const tieScores = Object.values(this.tiebreakerScores);
        const highestScore = Math.max(...tieScores);
        
        const winners = Object.keys(this.tiebreakerScores).filter(
            name => this.tiebreakerScores[name] === highestScore
        );
        
        if (winners.length > 1 && this.currentTiebreakerRound < 3) {
            this.currentTiebreakerRound++;
            this.tiedParticipants = winners;
            
            this.tiebreakerScores = {};
            winners.forEach(name => {
                this.tiebreakerScores[name] = 0;
            });
            
            this.showTiebreakerMessage();
        } else {
            for (const name in this.tiebreakerScores) {
                this.scores[name] += this.tiebreakerScores[name];
            }
            
            this.gameState = 'results';
            this.quizScreen.visible = false;
            this.createResultsScreen();
            
            this.playSound('win', { volume: 0.8 });
            
            if (this.soundEnabled) {
                this.stopSound('bgMusic');
                try {
                    PIXI.sound.Sound.from({
                        url: 'https://assets.mixkit.co/active_storage/sfx/1192/1192-preview.mp3',
                        preload: true,
                        loaded: (err, sound) => {
                            if (err) {
                                console.warn("Error loading celebration music:", err);
                            } else if (sound) {
                                this.bgMusic = sound;
                                this.bgMusic.loop = true;
                                this.bgMusic.volume = 0.7;
                                this.playSound('bgMusic');
                            }
                        }
                    });
                } catch (error) {
                    console.warn("Error creating celebration music:", error);
                }
            }
            
            this.startFireworks();
        }
    }

    createConfetti() {
        this.confettiSprites = [];
        
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                const confetti = new PIXI.Graphics();
                const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
                const color = colors[Math.floor(Math.random() * colors.length)];
                confetti.beginFill(color);

                const shapes = ['rect', 'circle', 'triangle'];
                const shape = shapes[Math.floor(Math.random() * shapes.length)];

                if (shape === 'rect') {
                    confetti.drawRect(0, 0, 10, 10);
                } else if (shape === 'circle') {
                    confetti.drawCircle(5, 5, 5);
                } else {
                    confetti.moveTo(0, 10);
                    confetti.lineTo(10, 10);
                    confetti.lineTo(5, 0);
                    confetti.lineTo(0, 10);
                }

                confetti.endFill();
                confetti.x = Math.random() * this.app.screen.width;
                confetti.y = -20;
                confetti.vx = Math.random() * 2 - 1;
                confetti.vy = Math.random() * 3 + 2;
                confetti.vr = Math.random() * 0.1 - 0.05;
                this.resultsScreen.addChild(confetti);
                this.confettiSprites.push(confetti);
            }, i * 50);
        }

        this.app.ticker.add(() => {
            for (let i = 0; i < this.confettiSprites.length; i++) {
                const confetti = this.confettiSprites[i];
                confetti.x += confetti.vx;
                confetti.y += confetti.vy;
                confetti.rotation += confetti.vr;

                if (confetti.y > this.app.screen.height + 20) {
                    this.resultsScreen.removeChild(confetti);
                    this.confettiSprites.splice(i, 1);
                    i--;
                }
            }
        });
    }

    cleanup() {
        if (this.cursorInterval) {
            clearInterval(this.cursorInterval);
            this.cursorInterval = null;
        }

        if (this.cursor && this.cursor.parent) {
            this.cursor.parent.removeChild(this.cursor);
            this.cursor = null;
        }

        this.cursorBlink = false;

        this.stopAllSounds();
        
        if (this.fireworkTimer) {
            clearInterval(this.fireworkTimer);
            this.fireworkTimer = null;
        }
        
        if (window.gsap) {
            try {
                gsap.killTweensOf("*");
            } catch (error) {
                console.warn("Error stopping GSAP animations:", error);
            }
        }
    }

    restart() {
        this.cleanup();
        location.reload();
    }

    createResultsScreen() {
        this.resultsScreen = new PIXI.Container();
        this.app.stage.addChild(this.resultsScreen);

        // خلفية داكنة للإبراز الألعاب النارية
        const bg = new PIXI.Graphics();
        bg.beginFill(0x000022);  // أزرق داكن جداً كالسماء ليلاً
        bg.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
        bg.endFill();
        this.resultsScreen.addChild(bg);
        
        // إضافة طبقة للألعاب النارية
        this.fireworksLayer = new PIXI.Container();
        this.resultsScreen.addChild(this.fireworksLayer);
        
        // طبقة شفافة على الخلفية للمحتوى الرئيسي
        const contentBg = new PIXI.Graphics();
        contentBg.beginFill(0x000055, 0.5);
        contentBg.drawRoundedRect(50, 50, this.app.screen.width - 100, this.app.screen.height - 100, 20);
        contentBg.endFill();
        this.resultsScreen.addChild(contentBg);

        // إضافة نجوم صغيرة متوهجة في الخلفية
        for (let i = 0; i < 100; i++) {
            const star = new PIXI.Graphics();
            const size = Math.random() * 2 + 1;
            star.beginFill(0xFFFFFF, Math.random() * 0.5 + 0.3);
            this.drawStar(star, 0, 0, 5, size, size / 2);
            star.endFill();
            star.x = Math.random() * this.app.screen.width;
            star.y = Math.random() * this.app.screen.height;
            
            // إضافة تأثير وميض للنجوم
            this.app.ticker.add(() => {
                star.alpha = 0.3 + Math.sin(Date.now() / (1000 + (i % 5) * 500)) * 0.5;
            });
            
            bg.addChild(star);
        }

        // إضافة تأثير الكونفيتي
        this.createConfetti();

        // عنوان النتائج بتأثير توهج ذهبي
        const title = new PIXI.Text('النتائج النهائية', {
            fontFamily: 'Arial',
            fontSize: 50,
            fill: 'gold',
            align: 'center',
            fontWeight: 'bold'
        });

        // تأثير توهج ذهبي للعنوان
        if (PIXI.filters && PIXI.filters.GlowFilter) {
            title.filters = [
                new PIXI.filters.GlowFilter({
                    color: 0xFFD700,
                    quality: 0.5,
                    distance: 20,
                    outerStrength: 3
                }),
                new PIXI.filters.DropShadowFilter({
                    color: 0x000000,
                    alpha: 0.5,
                    blur: 4,
                    distance: 6
                })
            ];
        }

        title.anchor.set(0.5);
        title.x = this.app.screen.width / 2;
        title.y = 80;
        this.resultsScreen.addChild(title);

        // ترتيب المشاركين حسب النقاط
        const sortedParticipants = [...this.participants].sort((a, b) => this.scores[b] - this.scores[a]);
        
        // استخراج الفائز
        const winner = sortedParticipants[0];
        
        // عرض كأس الفائز بحجم أكبر
        this.createTrophy(winner);

        // عرض اسم الفائز بشكل مميز
        const winnerText = new PIXI.Text(`${winner}`, {
            fontFamily: 'Arial',
            fontSize: 60,
            fill: 'gold',
            align: 'center',
            fontWeight: 'bold'
        });

        // إضافة توهج للنص
        if (PIXI.filters && PIXI.filters.GlowFilter) {
            winnerText.filters = [
                new PIXI.filters.GlowFilter({
                    color: 0xFFD700,
                    quality: 0.7,
                    distance: 20,
                    innerStrength: 1,
                    outerStrength: 3
                })
            ];
        }

        winnerText.anchor.set(0.5);
        winnerText.x = this.app.screen.width / 2;
        winnerText.y = 290;
        this.resultsScreen.addChild(winnerText);
        
        // إضافة نص الفائز
        const congratsText = new PIXI.Text('الفائز', {
            fontFamily: 'Arial',
            fontSize: 40,
            fill: 'white',
            align: 'center',
            fontWeight: 'bold'
        });
        congratsText.anchor.set(0.5);
        congratsText.x = this.app.screen.width / 2;
        congratsText.y = 240;
        this.resultsScreen.addChild(congratsText);

        // إضافة نص النقاط
        const scoreText = new PIXI.Text(`${this.scores[winner]} نقطة`, {
            fontFamily: 'Arial',
            fontSize: 40,
            fill: 'gold',
            align: 'center',
            fontWeight: 'bold'
        });
        scoreText.anchor.set(0.5);
        scoreText.x = this.app.screen.width / 2;
        scoreText.y = 350;
        this.resultsScreen.addChild(scoreText);

        // إضافة تحريك للنصوص
        this.app.ticker.add(() => {
            winnerText.scale.x = 1 + Math.sin(Date.now() / 500) * 0.05;
            winnerText.scale.y = 1 + Math.sin(Date.now() / 500) * 0.05;
            congratsText.alpha = 0.7 + Math.sin(Date.now() / 400) * 0.3;
        });

        // جدول بقية المراكز
        this.createScoreTable(sortedParticipants);

        // زر البدء من جديد
        const restartButton = new PIXI.Graphics();
        restartButton.beginFill(0x4CAF50);
        restartButton.drawRoundedRect(300, 550, 200, 50, 15);
        restartButton.endFill();

        // ظل للزر
        const buttonShadow = new PIXI.Graphics();
        buttonShadow.beginFill(0x000000, 0.4);
        buttonShadow.drawRoundedRect(305, 555, 200, 50, 15);
        buttonShadow.endFill();
        this.resultsScreen.addChild(buttonShadow);

        restartButton.eventMode = 'static';
        restartButton.cursor = 'pointer';

        restartButton.on('pointerover', () => {
            restartButton.tint = 0x66BB6A;
            restartButton.y = 548;
        });

        restartButton.on('pointerout', () => {
            restartButton.tint = 0xFFFFFF;
            restartButton.y = 550;
        });

        restartButton.on('pointerdown', () => {
            this.playSound('click');
            restartButton.y = 553;
            setTimeout(() => this.restart(), 300);
        });
        this.resultsScreen.addChild(restartButton);

        const restartButtonText = new PIXI.Text('بدء مسابقة جديدة', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 'white',
            fontWeight: 'bold'
        });
        restartButtonText.anchor.set(0.5);
        restartButtonText.x = 400;
        restartButtonText.y = 575;
        this.resultsScreen.addChild(restartButtonText);
        
        // تحريك الزر
        this.app.ticker.add(() => {
            buttonShadow.x = restartButton.x + 5;
            buttonShadow.y = restartButton.y + 5;
        });
    }

    // إنشاء كأس الفائز المميز
    createTrophy(winner) {
        const trophy = new PIXI.Container();
        
        // قاعدة الكأس
        const base = new PIXI.Graphics();
        base.beginFill(0xA67C00);
        base.drawRect(-40, 80, 80, 15);
        base.endFill();
        
        // جذع الكأس
        const stem = new PIXI.Graphics();
        stem.beginFill(0xFFD700);
        stem.drawRect(-10, 30, 20, 50);
        stem.endFill();
        
        // وعاء الكأس
        const cup = new PIXI.Graphics();
        cup.beginFill(0xFFD700);
        cup.drawEllipse(0, -10, 40, 10);
        cup.drawEllipse(0, 10, 40, 10);
        cup.endFill();
        
        // داخل وعاء الكأس بلون مختلف
        const cupInside = new PIXI.Graphics();
        cupInside.beginFill(0xA67C00, 0.5);
        cupInside.drawEllipse(0, 0, 30, 8);
        cupInside.endFill();
        
        // المقبضان
        const leftHandle = new PIXI.Graphics();
        leftHandle.beginFill(0xFFD700);
        leftHandle.drawEllipse(-45, 0, 8, 25);
        leftHandle.endFill();
        
        const rightHandle = new PIXI.Graphics();
        rightHandle.beginFill(0xFFD700);
        rightHandle.drawEllipse(45, 0, 8, 25);
        rightHandle.endFill();
        
        // تفاصيل إضافية
        const detail = new PIXI.Graphics();
        detail.lineStyle(3, 0xFFF0AA, 0.8);
        detail.moveTo(-35, 0);
        detail.lineTo(35, 0);
        
        // إضافة لمعة
        const shine = new PIXI.Graphics();
        shine.beginFill(0xFFFFFF, 0.8);
        shine.drawCircle(-15, -10, 8);
        shine.endFill();
        
        trophy.addChild(base, stem, cup, cupInside, leftHandle, rightHandle, detail, shine);
        
        // إضافة تاج أو نجمة على الكأس
        const crown = new PIXI.Graphics();
        crown.beginFill(0xFFD700);
        this.drawStar(crown, 0, -30, 5, 15, 5);
        crown.endFill();
        trophy.addChild(crown);
        
        // إضافة نص المركز الأول
        const firstPlace = new PIXI.Text('المركز الأول', {
            fontFamily: 'Arial',
            fontSize: 14,
            fill: 'black',
            fontWeight: 'bold'
        });
        firstPlace.anchor.set(0.5);
        firstPlace.x = 0;
        firstPlace.y = 90;
        trophy.addChild(firstPlace);
        
        // تموضع الكأس
        trophy.x = this.app.screen.width / 2;
        trophy.y = 160;
        trophy.scale.set(1.2);
        
        // تحريك الكأس
        this.app.ticker.add((delta) => {
            trophy.rotation = Math.sin(Date.now() / 3000) * 0.08;
            crown.rotation = Math.cos(Date.now() / 2000) * 0.2;
            shine.alpha = 0.5 + Math.sin(Date.now() / 1000) * 0.5;
        });
        
        this.resultsScreen.addChild(trophy);
    }

    // إنشاء جدول المراكز
    createScoreTable(sortedParticipants) {
        if (sortedParticipants.length <= 1) return;
        
        // إنشاء خلفية الجدول
        const tableBg = new PIXI.Graphics();
        tableBg.beginFill(0x000066, 0.5);
        tableBg.drawRoundedRect(400, 400, 350, 140, 10);
        tableBg.endFill();
        this.resultsScreen.addChild(tableBg);
        
        // عنوان الجدول
        const tableTitle = new PIXI.Text('المراكز الأخرى', {
            fontFamily: 'Arial',
            fontSize: 18,
            fill: 'white',
            fontWeight: 'bold'
        });
        tableTitle.x = 530;
        tableTitle.y = 410;
        tableTitle.anchor.set(0.5, 0);
        this.resultsScreen.addChild(tableTitle);
        
        // عرض المراكز بدءاً من المركز الثاني
        for (let i = 1; i < Math.min(sortedParticipants.length, 4); i++) {
            const participant = sortedParticipants[i];
            
            // خلفية للصف
            const rowBg = new PIXI.Graphics();
            rowBg.beginFill(0xFFFFFF, 0.1);
            rowBg.drawRoundedRect(405, 435 + (i - 1) * 30, 340, 25, 5);
            rowBg.endFill();
            this.resultsScreen.addChild(rowBg);
            
            // رموز الميداليات
            const medals = ["🥈", "🥉", "4️⃣"];
            const medal = new PIXI.Text(medals[i - 1], {
                fontSize: 18
            });
            medal.x = 420;
            medal.y = 438 + (i - 1) * 30;
            this.resultsScreen.addChild(medal);
            
            // اسم المتسابق
            const nameText = new PIXI.Text(participant, {
                fontFamily: 'Arial',
                fontSize: 18,
                fill: i === 1 ? 'silver' : i === 2 ? '#CD7F32' : 'white'
            });
            nameText.x = 450;
            nameText.y = 438 + (i - 1) * 30;
            this.resultsScreen.addChild(nameText);
            
            // النقاط
            const score = new PIXI.Text(`${this.scores[participant]} نقطة`, {
                fontFamily: 'Arial',
                fontSize: 16,
                fill: 'white'
            });
            score.x = 700;
            score.y = 439 + (i - 1) * 30;
            score.anchor.set(1, 0);
            this.resultsScreen.addChild(score);
        }
    }

    // إضافة دعم للألعاب النارية
    startFireworks() {
        // مؤقت لإطلاق ألعاب نارية بشكل عشوائي كل فترة
        this.fireworkTimer = setInterval(() => {
            this.launchFirework();
        }, 800);
    }

    launchFirework() {
        // إنشاء نقطة انطلاق الألعاب النارية
        const startX = 100 + Math.random() * (this.app.screen.width - 200);
        const endX = startX + (Math.random() * 40 - 20);
        const endY = 100 + Math.random() * 200;
        
        // لون الألعاب النارية
        const colors = [
            0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 
            0xFF00FF, 0x00FFFF, 0xFFDDAA, 0xFFAAAA
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // إنشاء المسار
        const rocket = new PIXI.Graphics();
        rocket.beginFill(0xFFFFFF);
        rocket.drawCircle(0, 0, 2);
        rocket.endFill();
        rocket.x = startX;
        rocket.y = this.app.screen.height;
        this.fireworksLayer.addChild(rocket);
        
        // صوت للإطلاق
        this.playSound('click', { volume: 0.1 });
        
        // تحريك الصاروخ للأعلى بدون استخدام GSAP
        let progress = 0;
        const animateRocket = () => {
            progress += 0.02;
            if (progress >= 1) {
                // إزالة الصاروخ
                if (rocket.parent) {
                    rocket.parent.removeChild(rocket);
                }
                
                // انفجار الألعاب النارية
                this.explodeFirework(endX, endY, color);
                
                // صوت الانفجار
                this.playSound('win', { volume: 0.2 });
                return;
            }
            
            rocket.x = startX + (endX - startX) * progress;
            rocket.y = this.app.screen.height + (endY - this.app.screen.height) * progress;
            requestAnimationFrame(animateRocket);
        };
        
        // بدء التحريك
        animateRocket();
    }

    explodeFirework(x, y, color) {
        // عدد الشظايا
        const particles = 30 + Math.floor(Math.random() * 20);
        const particleGroup = [];
        
        // حجم الانفجار
        const explosionSize = 3 + Math.random() * 2;
        
        // إنشاء شظايا الانفجار
        for (let i = 0; i < particles; i++) {
            const particle = new PIXI.Graphics();
            particle.beginFill(color);
            particle.drawCircle(0, 0, 2);
            particle.endFill();
            particle.x = x;
            particle.y = y;
            this.fireworksLayer.addChild(particle);
            particleGroup.push(particle);
            
            // اتجاه عشوائي
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 60 * explosionSize;
            
            // تحريك جزيئات الانفجار بدون استخدام GSAP
            let progress = 0;
            const animateParticle = () => {
                progress += 0.02;
                if (progress >= 1) {
                    // إزالة الجزيئات بعد الانتهاء
                    if (particle.parent) {
                        particle.parent.removeChild(particle);
                    }
                    
                    // حذف من المجموعة
                    const index = particleGroup.indexOf(particle);
                    if (index > -1) {
                        particleGroup.splice(index, 1);
                    }
                    return;
                }
                
                particle.x = x + Math.cos(angle) * distance * progress;
                particle.y = y + Math.sin(angle) * distance * progress;
                particle.alpha = 1 - progress;
                
                requestAnimationFrame(animateParticle);
            };
            
            // بدء التحريك
            animateParticle();
        }
    }
}
