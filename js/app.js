document.addEventListener('DOMContentLoaded', () => {
    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.textContent = 'جاري تحميل المسابقة...';
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.fontSize = '24px';
    loadingText.style.color = '#1099bb';
    loadingText.style.fontFamily = 'Arial, sans-serif';
    loadingText.style.textAlign = 'center';
    document.body.appendChild(loadingText);
    
    // Add loading dots animation
    let dots = 0;
    const loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        loadingText.textContent = 'جاري تحميل المسابقة' + '.'.repeat(dots);
    }, 500);
    
    // Check for sound availability with more reliable detection
    let soundAvailable = false;
    try {
        // Verify both PIXI object and sound module exist
        if (typeof PIXI !== 'undefined') {
            // Create a test sound to verify sound functionality
            if (typeof PIXI.sound !== 'undefined') {
                // Sounds are available, but we'll handle actual loading in the game class
                soundAvailable = true;
                console.log("PIXI Sound module detected and available");
            }
        }
        
        if (!soundAvailable) {
            console.warn("PIXI Sound module not properly available. Game will run without sound features.");
        }
    } catch (error) {
        console.warn("Error checking sound availability:", error);
    }
    
    // Add a fallback audio testing system
    const testFallbackAudio = () => {
        try {
            const audio = document.getElementById('fallbackAudio');
            if (audio) {
                audio.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
                audio.load();
                audio.play().then(() => {
                    console.log("Fallback audio system is working");
                }).catch(err => {
                    console.warn("Fallback audio system failed:", err);
                });
            }
        } catch (e) {
            console.warn("Fallback audio test error:", e);
        }
    };
    
    // Test audio after a short delay
    setTimeout(testFallbackAudio, 1000);
    
    // Simulate loading time for resources with longer delay to ensure sound initialization
    setTimeout(() => {
        clearInterval(loadingInterval);
        document.body.removeChild(loadingText);
        
        // Make sure the container exists before initializing the game
        if (document.getElementById('game-canvas')) {
            const game = new QuizGame();
            game.initializePixi('game-canvas');
        } else {
            console.error('Game canvas element not found!');
        }
    }, 3000); // Longer delay for better sound initialization
});
