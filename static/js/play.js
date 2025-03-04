// API URL'ini yapılandırma
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000'
    : 'https://web-production-56461.up.railway.app';

let wordsByLevel = {};
let currentLevel = 4;
let solvedWordsInCurrentLevel = 0;
let currentWord = null;
let letterBoxes = [];
let usedWordsInCurrentLevel = [];
let score = 0;
let timeLeft = 240; // 4 dakika = 240 saniye
let timer = null;
let usedLettersCount = 0; // Her kelime için kullanılan harf sayısı
let mainTimer = null;
let challengeTimer = null;
let challengeTimeLeft = 30;
let isChallengeModeActive = false;

// Veritabanından kelimeleri yükle
async function loadWordsFromDatabase() {
    try {
        const response = await fetch(`${API_URL}/words`);
        const words = await response.json();
        
        // Kelimeleri uzunluklarına göre grupla
        wordsByLevel = words.reduce((acc, word) => {
            const length = word.word.length;
            if (!acc[length]) acc[length] = [];
            acc[length].push({ word: word.word, hint: word.hint });
            return acc;
        }, {});
        
        initializeGame();
    } catch (error) {
        console.error('Error loading words:', error);
    }
}

function initializeGame() {
    const gameArea = document.querySelector('.word-boxes');
    gameArea.innerHTML = '';
    
    // Seviye bilgisini göster
    const levelInfo = document.querySelector('.level-info') || document.createElement('div');
    levelInfo.className = 'level-info';
    levelInfo.textContent = `Seviye: ${currentLevel} harf (${solvedWordsInCurrentLevel}/2)`;
    document.querySelector('.game-area').insertBefore(levelInfo, gameArea);

    // Yeni kelime seç (daha önce kullanılmamış kelimelerden)
    const availableWords = wordsByLevel[currentLevel].filter(word => 
        !usedWordsInCurrentLevel.includes(word.word)
    );
    currentWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Kutuları oluştur
    for (let i = 0; i < currentLevel; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.className = 'letter-box';
        gameArea.appendChild(input);
    }

    // İpucunu güncelle
    document.getElementById('hint').textContent = `İpucu: ${currentWord.hint}`;

    // Event listener'ları ayarla
    letterBoxes = document.querySelectorAll('.letter-box');
    setupEventListeners();
    
    // İlk kutuya fokuslan
    letterBoxes[0].focus();

    // Yeni kelime için harf sayacını sıfırla
    usedLettersCount = 0;
    
    // Timer'ı başlat (eğer başlatılmamışsa)
    if (!timer) {
        startTimer();
    }

    // Skor ve süreyi güncelle
    updateScore();
    updateTimer();
    
    // Harf alma butonunu aktif et
    document.getElementById('get-letter-btn').disabled = false;
}

function setupEventListeners() {
    letterBoxes.forEach((box, index) => {
        box.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                e.target.value = e.target.value.toUpperCase();
                if (index < letterBoxes.length - 1) {
                    letterBoxes[index + 1].focus();
                }
                if (isAllBoxesFilled()) {
                    setTimeout(checkGuess, 100); // Küçük bir gecikme ile kontrol et
                }
            }
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && index > 0 && box.value === '') {
                letterBoxes[index - 1].focus();
            }
        });
    });
}

function isAllBoxesFilled() {
    return Array.from(letterBoxes).every(box => box.value.length === 1);
}

function startTimer() {
    if (mainTimer) clearInterval(mainTimer);
    mainTimer = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('time').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateScore() {
    document.getElementById('score').textContent = score;
}

function getRandomLetter() {
    const emptyBoxes = Array.from(letterBoxes).filter(box => !box.value);
    if (emptyBoxes.length === 0) return;

    const randomBox = emptyBoxes[Math.floor(Math.random() * emptyBoxes.length)];
    const boxIndex = Array.from(letterBoxes).indexOf(randomBox);
    randomBox.value = currentWord.word[boxIndex];
    usedLettersCount++;
    
    if (isAllBoxesFilled()) {
        document.getElementById('get-letter-btn').disabled = true;
        setTimeout(checkGuess, 100); // Otomatik kontrol ekledik
    }
}

function calculateLevelScore() {
    // Seviye başına 100 puan, her alınan harf için 100 puan düşer
    return (currentLevel * 100) - (usedLettersCount * 100);
}

function endGame(isWin) {
    clearInterval(timer);
    const resultMessage = document.getElementById('result-message');
    
    if (isWin) {
        resultMessage.textContent = `Tebrikler! Oyunu ${score} puan ile kazandınız!`;
        resultMessage.style.color = 'green';
    } else {
        resultMessage.textContent = 'Süre doldu! Oyun bitti.';
        resultMessage.style.color = 'red';
    }
    
    // Tüm input'ları devre dışı bırak
    letterBoxes.forEach(box => box.disabled = true);
    document.getElementById('get-letter-btn').disabled = true;
}

function checkGuess() {
    let guess = Array.from(letterBoxes).map(box => box.value.toUpperCase()).join('');
    const resultMessage = document.getElementById('result-message');
    
    if (guess === currentWord.word) {
        resultMessage.textContent = 'Tebrikler! Doğru tahmin!';
        resultMessage.style.color = 'green';
        usedWordsInCurrentLevel.push(currentWord.word);
        solvedWordsInCurrentLevel++;

        // Meydan okuma modunda ise, başarılı şekilde bitir
        if (isChallengeModeActive) {
            endChallengeMode(true);
        }

        // Puanı güncelle
        score += calculateLevelScore();
        updateScore();

        if (solvedWordsInCurrentLevel === 2) {
            if (currentLevel === 10) {
                endGame(true);
                return;
            }
            setTimeout(() => {
                currentLevel++;
                solvedWordsInCurrentLevel = 0;
                usedWordsInCurrentLevel = [];
                initializeGame();
                resultMessage.textContent = `Tebrikler! ${currentLevel} harfli kelimelere geçtiniz!`;
            }, 1500);
        } else {
            setTimeout(() => {
                initializeGame();
                resultMessage.textContent = '';
            }, 1500);
        }
    } else {
        resultMessage.textContent = 'Yanlış tahmin, tekrar deneyin!';
        resultMessage.style.color = 'red';
        letterBoxes.forEach(box => {
            box.value = '';
        });
        letterBoxes[0].focus();
    }
}

// Meydan okuma modunu başlatan fonksiyon
function startChallengeMode() {
    isChallengeModeActive = true;
    challengeTimeLeft = 30;
    
    // Ana sayacı duraklat
    clearInterval(mainTimer);
    
    // Harf alma butonunu devre dışı bırak
    document.getElementById('get-letter-btn').disabled = true;
    
    // Meydan okuma butonunu devre dışı bırak
    document.getElementById('challenge-btn').disabled = true;
    
    // Meydan okuma sayacını başlat
    challengeTimer = setInterval(() => {
        challengeTimeLeft--;
        document.getElementById('challenge-btn').textContent = challengeTimeLeft;
        
        if (challengeTimeLeft <= 0) {
            endChallengeMode(false);
        }
    }, 1000);
}

// Meydan okuma modunu sonlandıran fonksiyon
function endChallengeMode(isSuccess) {
    isChallengeModeActive = false;
    clearInterval(challengeTimer);
    
    if (!isSuccess) {
        // Başarısız olursa puan düşür
        score -= currentLevel * 100;
        if (score < 0) score = 0;
        updateScore();
        
        // Doğru kelimeyi göster
        letterBoxes.forEach((box, index) => {
            box.value = currentWord.word[index];
            box.style.backgroundColor = '#ffebee'; // Hafif kırmızı arka plan
            box.disabled = true;
        });
        
        // Mesaj göster
        const resultMessage = document.getElementById('result-message');
        resultMessage.textContent = `Süre doldu! ${currentLevel * 100} puan kaybettiniz! Doğru kelime: ${currentWord.word}`;
        resultMessage.style.color = 'red';
        
        // 5 saniye sonra yeni kelimeye geç
        setTimeout(() => {
            // Kutuların stilini sıfırla
            letterBoxes.forEach(box => {
                box.style.backgroundColor = '';
                box.disabled = false;
            });
            
            // Butonları normale döndür
            document.getElementById('get-letter-btn').disabled = false;
            document.getElementById('challenge-btn').disabled = false;
            document.getElementById('challenge-btn').textContent = '30';
            
            // Ana sayacı tekrar başlat
            startTimer();
            
            // Yeni kelimeye geç
            initializeGame();
        }, 5000);
        
        return; // Fonksiyondan erken çık
    }
    
    // Başarılı durumda normal akışa devam et
    startTimer();
    document.getElementById('get-letter-btn').disabled = false;
    document.getElementById('challenge-btn').disabled = false;
    document.getElementById('challenge-btn').textContent = '30';
}

// Event listener'ları güncelleyelim
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('get-letter-btn').addEventListener('click', getRandomLetter);
    document.getElementById('challenge-btn').addEventListener('click', startChallengeMode);
    loadWordsFromDatabase(); // initializeGame yerine bunu çağır
});
