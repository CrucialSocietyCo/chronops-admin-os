<template>
  <div class="audio-recorder">
    <!-- Idle State -->
    <button 
      v-if="!isRecording && !isUploading"
      class="record-btn idle"
      @mousedown="startRecording"
      @touchstart.prevent="startRecording"
      title="Hold to Record (Max 5s)"
    >
      <div class="mic-icon">🎤</div>
      <span>HOLD TO SPEAK</span>
    </button>

    <!-- Recording State -->
    <div 
      v-else-if="isRecording" 
      class="record-btn recording"
      @mouseup="stopRecording"
      @mouseleave="cancelRecording"
      @touchend.prevent="stopRecording"
    >
      <div class="recording-indicator">
        <span class="dot"></span>
        <span>REC {{ formatTime(timer) }}</span>
      </div>
      <div class="waveform-hint">Listening...</div>
    </div>

    <!-- Uploading State -->
    <div v-else-if="isUploading" class="record-btn uploading">
      <div class="spinner">⏳</div>
      <span>SENDING...</span>
    </div>

    <div class="debug-status" :class="{ 'success-text': isSent }">{{ debugStatus }}</div>
  </div>
</template>

<script setup>
const emit = defineEmits(['sent'])
const { 
    isRecording, 
    isUploading, 
    isSent, 
    timer, 
    error, 
    debugStatus,
    startRecording, 
    stopRecording 
} = useAudioRecorder()

// Watch for sent state to emit up
watch(isSent, (val) => {
    if (val) emit('sent')
})

const formatTime = (s) => {
   return '0:0' + Math.floor(s)
}

// Cancel handler from UI
// The composable doesn't export cancel yet, but we can simulate it by just stopping and ignoring?
// Or we can add cancel to composable. For now, let's just alias cancel to stop to avoid breaking UI.
const cancelRecording = async () => {
    // Ideally we'd have a true cancel, but stopping is safe fallback
    await stopRecording()
}
</script>

<style scoped lang="scss">
.audio-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    width: 100%;
}

.record-btn {
    width: 100%;
    height: 60px;
    border: 2px outset #fff;
    background: #c0c0c0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    font-family: 'MS Sans Serif', sans-serif;
    font-weight: bold;
    user-select: none;
    -webkit-user-select: none; /* Mobile Safari fix */
    
    &:active {
        border-style: inset;
    }
}

.idle {
    color: #000;
    .mic-icon { font-size: 20px; }
}

.recording {
    background: #FFD700; /* Warning Yellow for "Live" feel */
    border: 2px inset #fff;
    color: #d00;
    
    .dot {
        display: inline-block;
        width: 10px; height: 10px;
        background: #f00;
        border-radius: 50%;
        margin-right: 5px;
        animation: pulse 1s infinite;
    }
}

.uploading {
    background: #e0e0e0;
    color: #404040;
}

.sent {
    background: #90EE90; /* Light Green */
    color: #006400;
    border-style: inset;
}

.error-msg {
    color: red;
    font-size: 11px;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.success-text {
    color: #008000;
    font-weight: bold;
    animation: flash 1s;
}

@keyframes flash {
    0% { background-color: #90EE90; }
    100% { background-color: transparent; }
}
</style>
