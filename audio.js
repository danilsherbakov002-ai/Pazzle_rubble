// ===== WEB AUDIO API SOUND ENGINE =====
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicEnabled = true;
        this.musicOscillator = null;
        this.musicGain = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Click sound - short pop
    playClick() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.08);
    }

    // Piece pick up sound
    playPickup() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
    }

    // Piece placed correctly - satisfying ding
    playPlace() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = this.ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    // Piece snap (magnetic) sound
    playSnap() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        
        osc1.type = 'sine';
        osc1.frequency.value = 880;
        
        osc2.type = 'sine';
        osc2.frequency.value = 1320;
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        
        osc1.start(this.ctx.currentTime);
        osc2.start(this.ctx.currentTime);
        osc1.stop(this.ctx.currentTime + 0.2);
        osc2.stop(this.ctx.currentTime + 0.2);
    }

    // Victory fanfare
    playVictory() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const melody = [
            { freq: 523.25, time: 0, dur: 0.15 },    // C5
            { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
            { freq: 783.99, time: 0.3, dur: 0.15 },  // G5
            { freq: 1046.5, time: 0.45, dur: 0.4 },  // C6
            { freq: 783.99, time: 0.7, dur: 0.15 },  // G5
            { freq: 1046.5, time: 0.85, dur: 0.6 },  // C6
        ];
        
        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'sine';
            osc.frequency.value = note.freq;
            
            const startTime = this.ctx.currentTime + note.time;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
            gain.gain.setValueAtTime(0.3, startTime + note.dur - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
            
            osc.start(startTime);
            osc.stop(startTime + note.dur + 0.01);
        });
        
        // Add harmony
        const chords = [
            { freq: 261.63, time: 0, dur: 0.45 },   // C4
            { freq: 329.63, time: 0, dur: 0.45 },   // E4
            { freq: 392.00, time: 0.45, dur: 1.0 }, // G4
            { freq: 523.25, time: 0.45, dur: 1.0 }, // C5
        ];
        
        chords.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'triangle';
            osc.frequency.value = note.freq;
            
            const startTime = this.ctx.currentTime + note.time;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gain.gain.setValueAtTime(0.15, startTime + note.dur - 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.dur);
            
            osc.start(startTime);
            osc.stop(startTime + note.dur + 0.01);
        });
    }

    // Background ambient music
    startMusic() {
        if (!this.musicEnabled || !this.ctx) return;
        if (this.musicOscillator) return;
        this.resume();
        
        // Create ambient pad
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.04;
        this.musicGain.connect(this.masterGain);
        
        const freqs = [130.81, 164.81, 196.00, 261.63]; // C3, E3, G3, C4
        
        this.musicOscillators = freqs.map(freq => {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            
            osc.connect(oscGain);
            oscGain.connect(this.musicGain);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            oscGain.gain.value = 0.25;
            
            // Slow LFO for movement
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.frequency.value = 0.1 + Math.random() * 0.2;
            lfoGain.gain.value = 2;
            lfo.start();
            
            osc.start();
            return { osc, lfo, oscGain };
        });
    }

    stopMusic() {
        if (this.musicOscillators) {
            this.musicOscillators.forEach(({ osc, lfo }) => {
                osc.stop();
                lfo.stop();
            });
            this.musicOscillators = null;
        }
        if (this.musicGain) {
            this.musicGain.disconnect();
            this.musicGain = null;
        }
    }

    // Error/wrong placement sound
    playError() {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.2);
    }

    setSFX(enabled) {
        this.enabled = enabled;
    }

    setMusic(enabled) {
        this.musicEnabled = enabled;
        if (enabled) {
            this.startMusic();
        } else {
            this.stopMusic();
        }
    }
}

// Global audio instance
const audio = new AudioEngine();

// Initialize on first user interaction
document.addEventListener('touchstart', () => {
    audio.init();
    audio.resume();
}, { once: true });

document.addEventListener('click', () => {
    audio.init();
    audio.resume();
}, { once: true });