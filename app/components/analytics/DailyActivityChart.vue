<template>
  <div class="chart-container">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps<{
  days: string[]          // "Dec 10", "Dec 09"...
  messages: number[]
  newUsers: number[]
}>()

const chartData = computed(() => ({
  labels: props.days,
  datasets: [
    {
      label: 'Messages',
      backgroundColor: '#000080',
      data: props.messages
    },
    {
      label: 'New Users',
      backgroundColor: '#008080',
      data: props.newUsers
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
    }
  },
  scales: {
    y: {
      beginAtZero: true
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  height: 100%;
  width: 100%;
  min-height: 250px;
}
</style>
