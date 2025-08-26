<template>
  <div
    ref="containerRef"
    class="gantt-vue-wrapper"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, toRefs } from 'vue';
import {GanttChart} from '../gantt-chartmeleon.js';
import '../gantt-chart.css';

// Define props
const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  groups: {
    type: Array,
    default: () => []
  },
  dependencies: {
    type: Array,
    default: () => []
  },
  options: {
    type: Object,
    default: () => ({})
  },
  viewMode: {
    type: String,
    default: 'day',
    validator: (value) => ['hour', 'day', 'week', 'month'].includes(value)
  },
  markedDays: {
    type: Array,
    default: () => []
  },
  theme: {
    type: String,
    default: 'default'
  }
});

// Define emits
const emit = defineEmits([
  // Task events
  'tasks-set',
  'task-add',
  'task-update',
  'task-remove',
  'task-click',
  'task-drag',
  'task-drop',
  'task-mouse-over',
  'task-mouse-out',

  // Group events
  'group-add',
  'group-remove',
  'group-click',
  'group-expand',
  'group-collapse',
  'expand-all',
  'collapse-all',

  // View events
  'view-mode-change',
  'zoom-change',

  // Day marking events
  'day-marked',
  'day-unmarked',
  'marked-days-cleared',

  // Dependencies
  'dependencies-set',

  // Lifecycle
  'ready',
  'destroy'
]);

// Refs
const containerRef = ref(null);
let ganttInstance = null;

// Destructure props for reactivity
const { tasks, groups, dependencies, options, viewMode, markedDays, theme } = toRefs(props);

// Initialize Gantt Chart
const initGantt = () => {
  if (!containerRef.value) return;

  // Merge options
  const ganttOptions = {
    ...options.value,
    viewMode: viewMode.value,
    theme: theme.value
  };

  // Create instance
  ganttInstance = new GanttChart(containerRef.value, ganttOptions);

  // Setup event listeners
  setupEventListeners();

  // Set initial data
  if (tasks.value.length > 0) {
    ganttInstance.setTasks(tasks.value, groups.value);
  }

  if (dependencies.value.length > 0) {
    ganttInstance.setDependencies(dependencies.value);
  }

  // Mark days
  markedDays.value.forEach(day => {
    ganttInstance.markDay(day.date, day.type, day.color);
  });

  emit('ready', ganttInstance);
};

// Setup event listeners
const setupEventListeners = () => {
  if (!ganttInstance) return;

  // Task events
  ganttInstance.on('tasksSet', (data) => emit('tasks-set', data));
  ganttInstance.on('taskAdd', (task) => emit('task-add', task));
  ganttInstance.on('taskUpdate', (task) => emit('task-update', task));
  ganttInstance.on('taskRemove', (task) => emit('task-remove', task));
  ganttInstance.on('taskClick', (task) => emit('task-click', task));
  ganttInstance.on('taskDrag', (data) => emit('task-drag', data));
  ganttInstance.on('taskDrop', (data) => emit('task-drop', data));
  ganttInstance.on('taskMouseOver', (data) => emit('task-mouse-over', data));
  ganttInstance.on('taskMouseOut', (data) => emit('task-mouse-out', data));

  // Group events
  ganttInstance.on('groupAdd', (group) => emit('group-add', group));
  ganttInstance.on('groupRemove', (group) => emit('group-remove', group));
  ganttInstance.on('groupClick', (group) => emit('group-click', group));
  ganttInstance.on('groupExpand', (groupId) => emit('group-expand', groupId));
  ganttInstance.on('groupCollapse', (groupId) => emit('group-collapse', groupId));
  ganttInstance.on('expandAll', () => emit('expand-all'));
  ganttInstance.on('collapseAll', () => emit('collapse-all'));

  // View events
  ganttInstance.on('viewModeChange', (mode) => emit('view-mode-change', mode));
  ganttInstance.on('zoomChange', (data) => emit('zoom-change', data));

  // Day marking events
  ganttInstance.on('dayMarked', (data) => emit('day-marked', data));
  ganttInstance.on('dayUnmarked', (data) => emit('day-unmarked', data));
  ganttInstance.on('markedDaysCleared', () => emit('marked-days-cleared'));

  // Dependencies
  ganttInstance.on('dependenciesSet', (deps) => emit('dependencies-set', deps));
};

// Watch for prop changes
watch(tasks, (newTasks) => {
  if (ganttInstance) {
    ganttInstance.setTasks(newTasks, groups.value);
  }
}, { deep: true });

watch(groups, (newGroups) => {
  if (ganttInstance) {
    ganttInstance.setTasks(tasks.value, newGroups);
  }
}, { deep: true });

watch(dependencies, (newDeps) => {
  if (ganttInstance) {
    ganttInstance.setDependencies(newDeps);
  }
}, { deep: true });

watch(viewMode, (newMode) => {
  if (ganttInstance) {
    ganttInstance.setViewMode(newMode);
  }
});

watch(markedDays, (newMarkedDays) => {
  if (ganttInstance) {
    ganttInstance.clearMarkedDays();
    newMarkedDays.forEach(day => {
      ganttInstance.markDay(day.date, day.type, day.color);
    });
  }
}, { deep: true });

watch(theme, (newTheme) => {
  if (containerRef.value) {
    // Remove old theme class
    containerRef.value.classList.remove('gantt-theme-default', 'gantt-theme-dark');
    // Add new theme class
    containerRef.value.classList.add(`gantt-theme-${newTheme}`);
  }
});

// Lifecycle hooks
onMounted(() => {
  initGantt();
});

onUnmounted(() => {
  if (ganttInstance) {
    emit('destroy');
    ganttInstance.destroy();
    ganttInstance = null;
  }
});

// Expose methods
defineExpose({
  // Get the Gantt instance
  getInstance: () => ganttInstance,

  // Task management
  addTask: (task) => ganttInstance?.addTask(task),
  updateTask: (taskId, updates) => ganttInstance?.updateTask(taskId, updates),
  removeTask: (taskId) => ganttInstance?.removeTask(taskId),
  getTask: (taskId) => ganttInstance?.getTask(taskId),
  getTasks: () => ganttInstance?.getTasks() || [],

  // Group management
  addGroup: (group) => ganttInstance?.addGroup(group),
  removeGroup: (groupId) => ganttInstance?.removeGroup(groupId),
  toggleGroup: (groupId) => ganttInstance?.toggleGroup(groupId),
  expandAll: () => ganttInstance?.expandAll(),
  collapseAll: () => ganttInstance?.collapseAll(),
  getGroup: (groupId) => ganttInstance?.getGroup(groupId),
  getGroups: () => ganttInstance?.getGroups() || [],

  // View management
  setViewMode: (mode) => ganttInstance?.setViewMode(mode),
  getVisibleTasks: () => ganttInstance?.getVisibleTasks() || [],
  getDateRange: () => ganttInstance?.getDateRange(),

  // Day marking
  markDay: (date, type, color) => ganttInstance?.markDay(date, type, color),
  unmarkDay: (date) => ganttInstance?.unmarkDay(date),
  clearMarkedDays: () => ganttInstance?.clearMarkedDays(),

  // Dependencies
  setDependencies: (deps) => ganttInstance?.setDependencies(deps),

  // Rendering
  render: () => ganttInstance?.render(),

  // Zoom
  getZoom: () => ganttInstance?.getZoom(),
  setZoom: (cw) => ganttInstance?.setZoom(cw),
  zoomIn: (step) => ganttInstance?.zoomIn(step),
  zoomOut: (step) => ganttInstance?.zoomOut(step)
});
</script>

<style scoped>
.gantt-vue-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
