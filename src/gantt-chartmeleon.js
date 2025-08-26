// src/gantt-chart.js
import './gantt-chartmeleon.css';

const DEFAULT_OPTIONS = {
  viewMode: 'day',
  minDate: null,
  maxDate: null,
  rowHeight: 40,
  headerHeight: 50,
  columnWidth: 30,
  taskMinWidth: 40,
  enableDragDrop: true,
  showSidebar: true,
  sidebarWidth: 200,
  locale: 'en-US',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  theme: 'default'
};

class GanttChart {
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('GanttChart requires a container element');
    }

    this.container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.container) {
      throw new Error('GanttChart container not found');
    }

    // Merge options with defaults
    this.options = {...DEFAULT_OPTIONS, ...options};

    // State
    this.tasks = [];
    this.groups = [];
    this.dependencies = [];
    this.markedDays = new Set();
    this.collapsedGroups = new Set();
    this.viewMode = this.options.viewMode;
    this.dragging = null;
    this.listeners = {};
    this.visibleTasks = [];
    this._initialized = false;

    // Initialize
    this.init();
  }

  init() {
    if (this._initialized) return;

    this.createDOM();
    this.setupEventListeners();
    this.setupSidebarResize();
    this.setupScrollSync();
    this.setupInfiniteHorizontalScroll();
    this.render();
    this._initialized = true;
  }

  createDOM() {
    // Clear container
    this.container.innerHTML = '';
    this.container.classList.add('gantt-container');
    // Apply theme class to container so CSS theme rules take effect
    if (this.options.theme) {
      this.container.classList.add(`gantt-theme-${this.options.theme}`);
    }

    // Create main structure
    const mainDiv = document.createElement('div');
    mainDiv.className = 'gantt-main';

    if (this.options.showSidebar) {
      // Create sidebar
      const sidebar = document.createElement('div');
      sidebar.className = 'gantt-sidebar';
      sidebar.id = `gantt-sidebar-${this.generateId()}`;
      sidebar.style.minWidth = this.options.sidebarWidth + 'px';
      sidebar.style.maxWidth = this.options.sidebarWidth + 'px';

      const sidebarHeader = document.createElement('div');
      sidebarHeader.className = 'gantt-sidebar-header';
      sidebarHeader.textContent = this.options.sidebarTitle || 'Tasks';
      this.sidebarHeader = sidebarHeader;

      const sidebarContent = document.createElement('div');
      sidebarContent.className = 'gantt-sidebar-content';

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'gantt-resize-handle';

      sidebar.appendChild(sidebarHeader);
      sidebar.appendChild(sidebarContent);
      sidebar.appendChild(resizeHandle);

      mainDiv.appendChild(sidebar);

      this.sidebarElement = sidebar;
      this.sidebarContent = sidebarContent;
      this.resizeHandle = resizeHandle;
    }

    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'gantt-chart-container';
    this.chartContainer = chartContainer;

    // Sticky header overlay inside scroll container
    const headerDiv = document.createElement('div');
    headerDiv.className = 'gantt-chart-header-sticky';
    const headerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    headerSvg.classList.add('gantt-svg');
    headerDiv.appendChild(headerSvg);
    this.headerSvg = headerSvg;

    const wrapper = document.createElement('div');
    wrapper.className = 'gantt-wrapper';

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('gantt-svg');

    // Add defs for arrow markers
    this.createSVGDefs();

    // Order: header (sticky) then scrollable content wrapper
    chartContainer.appendChild(headerDiv);
    wrapper.appendChild(this.svg);
    chartContainer.appendChild(wrapper);
    mainDiv.appendChild(chartContainer);

    this.container.appendChild(mainDiv);
  }

  createSVGDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
            <marker id="arrowhead-${this.generateId()}" markerWidth="10" markerHeight="10" 
                    refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#666" />
            </marker>
        `;
    this.svg.appendChild(defs);
    this.arrowId = `arrowhead-${this.generateId()}`;
  }

  setupEventListeners() {
    if (this.options.enableDragDrop) {
      this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.svg.addEventListener('touchstart', this.handleTouchStart.bind(this), {passive: false});

      // Global listeners
      this._mouseMoveHandler = this.handleMouseMove.bind(this);
      this._mouseUpHandler = this.handleMouseUp.bind(this);
      this._touchMoveHandler = this.handleTouchMove.bind(this);
      this._touchEndHandler = this.handleTouchEnd.bind(this);

      document.addEventListener('mousemove', this._mouseMoveHandler);
      document.addEventListener('mouseup', this._mouseUpHandler);
      document.addEventListener('touchmove', this._touchMoveHandler, {passive: false});
      document.addEventListener('touchend', this._touchEndHandler);
    }

    this.svg.addEventListener('click', this.handleClick.bind(this));
    this.svg.addEventListener('mouseover', this.handleMouseOver.bind(this));
    this.svg.addEventListener('mouseout', this.handleMouseOut.bind(this));
  }

  setupSidebarResize() {
    if (!this.options.showSidebar || !this.resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    this.resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.pageX;
      startWidth = this.sidebarElement.offsetWidth;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const width = startWidth + (e.pageX - startX);
      if (width >= 150 && width <= 400) {
        this.sidebarElement.style.minWidth = width + 'px';
        this.sidebarElement.style.maxWidth = width + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  setupScrollSync() {
    // Synchronize vertical scrolling between the chart and the sidebar list
    if (!this.chartContainer || !this.sidebarContent) return;

    // Avoid duplicate listeners if re-initialized
    if (this._scrollSyncInitialized) return;
    this._scrollSyncInitialized = true;

    this._isSyncingScroll = false;

    this.chartContainer.addEventListener('scroll', () => {
      if (this._isSyncingScroll) return;
      this._isSyncingScroll = true;
      try {
        this.sidebarContent.scrollTop = this.chartContainer.scrollTop;
      } finally {
        this._isSyncingScroll = false;
      }
    });

    this.sidebarContent.addEventListener('scroll', () => {
      if (this._isSyncingScroll) return;
      this._isSyncingScroll = true;
      try {
        this.chartContainer.scrollTop = this.sidebarContent.scrollTop;
      } finally {
        this._isSyncingScroll = false;
      }
    });
  }
  
  setupInfiniteHorizontalScroll() {
    // Initialize once
    if (this._infiniteHScrollInitialized) return;
    this._infiniteHScrollInitialized = true;

    if (!this.chartContainer) return;

    const thresholdPx = 200; // distance from edges to trigger extension
    let ticking = false;

    const getChunkSize = () => {
      switch (this.viewMode) {
        case 'hour':
          return 48; // 2 days of hours
        case 'day':
          return 30; // ~1 month of days
        case 'week':
          return 26; // ~half a year of weeks
        case 'month':
          return 12; // 1 year of months
        default:
          return 30;
      }
    };

    const extendRight = (cols) => {
      const oldMax = new Date(this.maxDate);
      const newMax = new Date(this.maxDate);
      switch (this.viewMode) {
        case 'hour': newMax.setHours(newMax.getHours() + cols); break;
        case 'day': newMax.setDate(newMax.getDate() + cols); break;
        case 'week': newMax.setDate(newMax.getDate() + 7 * cols); break;
        case 'month': newMax.setMonth(newMax.getMonth() + cols); break;
        default: newMax.setDate(newMax.getDate() + cols);
      }
      this.maxDate = newMax;
      // Re-render after extending right; viewport can remain as-is
      const prevScrollLeft = this.chartContainer.scrollLeft;
      this.render();
      if (this.options.showSidebar) this.renderSidebar();
      // preserve scroll position
      this.chartContainer.scrollLeft = prevScrollLeft;
      this.emit('rangeExtend', { direction: 'right', from: oldMax, to: newMax });
    };

    const extendLeft = (cols) => {
      const oldMin = new Date(this.minDate);
      const newMin = new Date(this.minDate);
      switch (this.viewMode) {
        case 'hour': newMin.setHours(newMin.getHours() - cols); break;
        case 'day': newMin.setDate(newMin.getDate() - cols); break;
        case 'week': newMin.setDate(newMin.getDate() - 7 * cols); break;
        case 'month': newMin.setMonth(newMin.getMonth() - cols); break;
        default: newMin.setDate(newMin.getDate() - cols);
      }
      // Compute how many visual columns were added for scroll compensation
      const addedColumns = cols; // for all modes we add exactly 'cols' columns (week adds 1 col per week)
      const deltaPx = addedColumns * this.options.columnWidth;

      this.minDate = newMin;
      const prevScrollLeft = this.chartContainer.scrollLeft;
      this.render();
      if (this.options.showSidebar) this.renderSidebar();
      // Keep viewport anchored by shifting scrollLeft right by the new columns width
      this.chartContainer.scrollLeft = prevScrollLeft + deltaPx;
      this.emit('rangeExtend', { direction: 'left', from: oldMin, to: newMin });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          const el = this.chartContainer;
          const { scrollLeft, scrollWidth, clientWidth } = el;
          const atRight = scrollLeft + clientWidth >= scrollWidth - thresholdPx;
          const atLeft = scrollLeft <= thresholdPx;

          // Guard against recursive handling while we are programmatically updating scroll
          if (atRight) {
            extendRight(getChunkSize());
          } else if (atLeft) {
            extendLeft(getChunkSize());
          }
        } finally {
          ticking = false;
        }
      });
    };

    this.chartContainer.addEventListener('scroll', onScroll);
  }
  
  // Public API Methods

  // Zoom API
  getZoom() {
    return this.options.columnWidth;
  }

  setZoom(columnWidth) {
    // clamp to sensible bounds
    const min = 10;
    const max = 120;
    const prev = this.options.columnWidth;
    const next = Math.max(min, Math.min(max, Math.round(columnWidth)));
    if (next === prev) return;
    this.options.columnWidth = next;
    // re-render with same tasks/date range; ensure fills width if needed
    this.render();
    if (this.options.showSidebar) {
      this.renderSidebar();
    }
    this.emit('zoomChange', { columnWidth: next });
  }

  zoomIn(step = 5) {
    this.setZoom(this.options.columnWidth + step);
  }

  zoomOut(step = 5) {
    this.setZoom(this.options.columnWidth - step);
  }

  // Scroll API
  scrollToDate(date, { align = 'center', behavior = 'auto', paddingColumns = 2 } = {}) {
    if (!this.chartContainer) return;
    if (!date) return;
    const target = new Date(date);
    if (isNaN(target.getTime())) return;

    // Ensure the target date is within current range; extend if necessary
    let needsRender = false;
    const oldMin = this.minDate ? new Date(this.minDate) : null;
    const oldMax = this.maxDate ? new Date(this.maxDate) : null;

    if (!this.minDate || target < this.minDate) {
      // extend min left by paddingColumns as well
      const newMin = new Date(target);
      switch (this.viewMode) {
        case 'hour': newMin.setHours(newMin.getHours() - paddingColumns); break;
        case 'day': newMin.setDate(newMin.getDate() - paddingColumns); break;
        case 'week': newMin.setDate(newMin.getDate() - 7 * paddingColumns); break;
        case 'month': newMin.setMonth(newMin.getMonth() - paddingColumns); break;
        default: newMin.setDate(newMin.getDate() - paddingColumns);
      }
      this.minDate = newMin;
      needsRender = true;
    }
    if (!this.maxDate || target > this.maxDate) {
      const newMax = new Date(target);
      switch (this.viewMode) {
        case 'hour': newMax.setHours(newMax.getHours() + paddingColumns); break;
        case 'day': newMax.setDate(newMax.getDate() + paddingColumns); break;
        case 'week': newMax.setDate(newMax.getDate() + 7 * paddingColumns); break;
        case 'month': newMax.setMonth(newMax.getMonth() + paddingColumns); break;
        default: newMax.setDate(newMax.getDate() + paddingColumns);
      }
      this.maxDate = newMax;
      needsRender = true;
    }

    if (needsRender) {
      const prevTop = this.chartContainer.scrollTop;
      this.render();
      if (this.options.showSidebar) this.renderSidebar();
      // preserve vertical scroll
      this.chartContainer.scrollTop = prevTop;
      this.emit('rangeExtend', { direction: 'both', from: oldMin, to: oldMax });
    }

    // Compute x position and desired scrollLeft
    const columns = this.getColumns();
    const x = this.dateToX(target, columns);
    const el = this.chartContainer;
    const viewW = el.clientWidth || 0;

    let left = x;
    if (align === 'center') {
      left = x - viewW / 2;
    } else if (align === 'end') {
      left = x - viewW;
    }

    // Clamp scroll bounds
    const maxLeft = Math.max(0, el.scrollWidth - viewW);
    left = Math.max(0, Math.min(maxLeft, left));

    try {
      if (el.scrollTo) {
        el.scrollTo({ left, top: el.scrollTop, behavior });
      } else {
        el.scrollLeft = left;
      }
    } catch (e) {
      el.scrollLeft = left;
    }

    this.emit('scrollToDate', { date: target, align });
  }

  scrollToToday(options = {}) {
    this.scrollToDate(new Date(), options);
  }

  setTasks(tasks, groups = []) {
    this.tasks = tasks.map(task => this.normalizeTask(task));
    this.groups = groups.map(group => this.normalizeGroup(group));

    this.calculateDateRange();
    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('tasksSet', {tasks: this.tasks, groups: this.groups});
  }

  addTask(task) {
    const newTask = this.normalizeTask(task);
    this.tasks.push(newTask);

    this.calculateDateRange();
    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('taskAdd', newTask);
    return newTask;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    Object.assign(task, updates);
    if (updates.start) task.start = new Date(updates.start);
    if (updates.end) task.end = new Date(updates.end);

    this.calculateDateRange();
    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('taskUpdate', task);
    return task;
  }

  removeTask(taskId) {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;

    const removed = this.tasks.splice(index, 1)[0];

    this.calculateDateRange();
    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('taskRemove', removed);
    return removed;
  }

  addGroup(group) {
    const newGroup = this.normalizeGroup(group);
    this.groups.push(newGroup);

    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('groupAdd', newGroup);
    return newGroup;
  }

  removeGroup(groupId) {
    const index = this.groups.findIndex(g => g.id === groupId);
    if (index === -1) return null;

    const removed = this.groups.splice(index, 1)[0];

    // Ungroup tasks in this group
    this.tasks.forEach(task => {
      if (task.group === groupId) {
        task.group = null;
      }
    });

    // Re-parent child groups to root
    this.groups.forEach(g => {
      if (g.parent === groupId) {
        g.parent = null;
      }
    });

    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('groupRemove', removed);
    return removed;
  }

  toggleGroup(groupId) {
    if (this.collapsedGroups.has(groupId)) {
      this.collapsedGroups.delete(groupId);
      this.emit('groupExpand', groupId);
    } else {
      this.collapsedGroups.add(groupId);
      this.emit('groupCollapse', groupId);
    }

    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }
  }

  expandAll() {
    this.collapsedGroups.clear();
    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('expandAll');
  }

  collapseAll() {
    this.groups.forEach(group => {
      this.collapsedGroups.add(group.id);
    });

    this.updateVisibleTasks();
    this.render();

    if (this.options.showSidebar) {
      this.renderSidebar();
    }

    this.emit('collapseAll');
  }

  setViewMode(mode) {
    const validModes = ['hour', 'day', 'week', 'month'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid view mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    this.viewMode = mode;
    this.calculateDateRange();
    this.render();
    this.emit('viewModeChange', mode);
  }

  markDay(date, type = 'special', color = null) {
    const dateStr = this.dateToString(new Date(date));
    this.markedDays.add({
      date: dateStr,
      type,
      color: color || this.getMarkedDayColor(type)
    });
    this.render();
    this.emit('dayMarked', {date: dateStr, type, color});
  }

  unmarkDay(date) {
    const dateStr = this.dateToString(new Date(date));
    let removed = false;

    this.markedDays.forEach(marked => {
      if (marked.date === dateStr) {
        this.markedDays.delete(marked);
        removed = true;
      }
    });

    if (removed) {
      this.render();
      this.emit('dayUnmarked', {date: dateStr});
    }
  }

  clearMarkedDays() {
    this.markedDays.clear();
    this.render();
    this.emit('markedDaysCleared');
  }

  setDependencies(dependencies) {
    this.dependencies = dependencies;
    this.render();
    this.emit('dependenciesSet', dependencies);
  }

  // Event System

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this; // Allow chaining
  }

  off(event, callback) {
    if (!this.listeners[event]) return this;

    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      // Remove all listeners for this event
      delete this.listeners[event];
    }
    return this; // Allow chaining
  }

  emit(event, data) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  // Utility Methods

  getTask(taskId) {
    return this.tasks.find(t => t.id === taskId) || null;
  }

  getGroup(groupId) {
    return this.groups.find(g => g.id === groupId) || null;
  }

  getTasks() {
    return [...this.tasks];
  }

  getGroups() {
    return [...this.groups];
  }

  getVisibleTasks() {
    return [...this.visibleTasks];
  }

  getDateRange() {
    return {
      start: new Date(this.minDate),
      end: new Date(this.maxDate)
    };
  }

  // Cleanup

  destroy() {
    // Remove event listeners
    if (this._mouseMoveHandler) {
      document.removeEventListener('mousemove', this._mouseMoveHandler);
      document.removeEventListener('mouseup', this._mouseUpHandler);
      document.removeEventListener('touchmove', this._touchMoveHandler);
      document.removeEventListener('touchend', this._touchEndHandler);
    }

    // Clear container
    this.container.innerHTML = '';
    this.container.classList.remove('gantt-container');

    // Clear state
    this.tasks = [];
    this.groups = [];
    this.dependencies = [];
    this.markedDays.clear();
    this.collapsedGroups.clear();
    this.listeners = {};
    this.visibleTasks = [];
    this._initialized = false;

    this.emit('destroy');
  }

  // Private Methods

  normalizeTask(task) {
    return {
      id: task.id || this.generateId(),
      name: task.name || 'Untitled Task',
      start: new Date(task.start),
      end: new Date(task.end),
      progress: task.progress || 0,
      color: task.color || '#2196F3',
      textColor: task.textColor || '#ffffff',
      dependencies: task.dependencies || [],
      group: task.group || null,
      workOrder: task.workOrder || '',
      assignee: task.assignee || '',
      type: task.type || 'task',
      metadata: task.metadata || {},
      ...task
    };
  }

  normalizeGroup(group) {
    return {
      id: group.id || this.generateId(),
      name: group.name || 'Untitled Group',
      workOrder: group.workOrder || '',
      color: group.color || '#607D8B',
      metadata: group.metadata || {},
      parent: group.parent || null,
      ...group
    };
  }

  calculateDateRange() {
    if (this.tasks.length === 0) {
      const now = new Date();
      this.minDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.maxDate = new Date(now.getFullYear(), now.getMonth() + 8, 0);
      return;
    }

    const allDates = this.tasks.flatMap(task => [task.start, task.end]);
    this.minDate = new Date(Math.min(...allDates));
    this.maxDate = new Date(Math.max(...allDates));

    // Add padding based on view mode
    const padding = this.getViewModePadding();
    this.minDate.setDate(this.minDate.getDate() - padding);
    this.maxDate.setDate(this.maxDate.getDate() + padding);
  }

  getViewModePadding() {
    switch (this.viewMode) {
      case 'hour':
        return 1;
      case 'day':
        return 7;
      case 'week':
        return 14;
      case 'month':
        return 30;
      default:
        return 7;
    }
  }

  updateVisibleTasks() {
    this.visibleTasks = [];

    // Build children map for groups (support nested groups)
    const childrenMap = new Map();
    // Initialize root list
    childrenMap.set(null, []);

    this.groups.forEach(g => {
      const parentId = g.parent || null;
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId).push(g);
    });

    const addGroupAndChildren = (group, depth) => {
      this.visibleTasks.push({ type: 'group', data: group, depth });
      if (this.collapsedGroups.has(group.id)) return;

      // First, render child groups
      const childGroups = childrenMap.get(group.id) || [];
      childGroups.forEach(child => addGroupAndChildren(child, depth + 1));

      // Then, render tasks belonging to this group
      const groupTasks = this.tasks.filter(t => t.group === group.id);
      groupTasks.forEach(task => {
        this.visibleTasks.push({ type: 'task', data: task, depth: depth + 1 });
      });
    };

    // Render root groups and their subtrees
    const rootGroups = childrenMap.get(null) || [];
    rootGroups.forEach(g => addGroupAndChildren(g, 0));

    // Add ungrouped tasks
    const ungroupedTasks = this.tasks.filter(t => !t.group);
    ungroupedTasks.forEach(task => {
      this.visibleTasks.push({ type: 'task', data: task, depth: 0 });
    });
  }

  renderSidebar() {
    if (!this.sidebarContent) return;

    this.sidebarContent.innerHTML = '';

    this.visibleTasks.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'gantt-row-label';
      row.setAttribute('data-row-index', index);
      // Ensure row height matches chart rowHeight exactly
      row.style.height = this.options.rowHeight + 'px';

      const depth = item.depth || 0;

      if (item.type === 'group') {
        row.classList.add('gantt-group-label');
        // Indentation for nested groups
        row.style.paddingLeft = `${10 + depth * 20}px`;

        const icon = document.createElement('span');
        icon.className = 'gantt-collapse-icon';
        icon.innerHTML = this.collapsedGroups.has(item.data.id) ? '▶' : '▼';
        icon.onclick = (e) => {
          e.stopPropagation();
          this.toggleGroup(item.data.id);
        };
        row.appendChild(icon);

        const info = document.createElement('div');
        info.className = 'gantt-task-info';

        const name = document.createElement('div');
        name.className = 'gantt-task-name';
        name.textContent = item.data.name;
        info.appendChild(name);

        if (item.data.workOrder) {
          const meta = document.createElement('div');
          meta.className = 'gantt-task-meta';
          meta.textContent = `WO: ${item.data.workOrder}`;
          info.appendChild(meta);
        }

        row.appendChild(info);
      } else {
        if (item.data.group) {
          row.classList.add('gantt-child-label');
          // Indentation for tasks under nested groups (align with group indentation + child offset)
          const taskDepth = depth > 0 ? depth - 1 : 0;
          row.style.paddingLeft = `${35 + taskDepth * 20}px`;
        }

        const info = document.createElement('div');
        info.className = 'gantt-task-info';

        const name = document.createElement('div');
        name.className = 'gantt-task-name';
        name.textContent = item.data.name;
        info.appendChild(name);

        const metaItems = [];
        if (item.data.workOrder) metaItems.push(`WO: ${item.data.workOrder}`);
        if (item.data.assignee) metaItems.push(item.data.assignee);

        if (metaItems.length > 0) {
          const meta = document.createElement('div');
          meta.className = 'gantt-task-meta';
          meta.textContent = metaItems.join(' • ');
          info.appendChild(meta);
        }

        row.appendChild(info);
      }

      row.onclick = () => {
        if (item.type === 'task') {
          this.emit('taskClick', item.data);
        } else {
          this.emit('groupClick', item.data);
        }
      };

      this.sidebarContent.appendChild(row);
    });
  }

  render() {
    // Clear both SVGs
    this.svg.innerHTML = '';
    if (this.headerSvg) this.headerSvg.innerHTML = '';
    this.createSVGDefs();

    // Ensure the date range fills the available width by adding more time units if needed
    this.ensureRangeFillsWidth();

    const columns = this.getColumns();
    const gridWidth = columns.length * this.options.columnWidth;
    const headerH = this.getTotalHeaderHeight();
    const headerOffset = this.headerSvg ? 0 : headerH;
    const gridHeight = this.visibleTasks.length * this.options.rowHeight + headerOffset;

    // Ensure sidebar header matches chart header height for alignment
    if (this.options.showSidebar && this.sidebarHeader) {
      this.sidebarHeader.style.height = headerH + 'px';
    }

    // Size main (scrollable) SVG and sticky header SVG
    this.svg.setAttribute('width', gridWidth);
    this.svg.setAttribute('height', gridHeight);
    if (this.headerSvg) {
      this.headerSvg.setAttribute('width', gridWidth);
      this.headerSvg.setAttribute('height', headerH);
    }

    // Draw elements (header goes to sticky header SVG)
    this.drawGrid(columns);
    if (this.headerSvg) {
      this.drawHeader(columns, this.headerSvg);
    } else {
      this.drawHeader(columns);
    }
    this.drawTasks(columns);
    this.drawDependencies(columns);
  }

  // Ensure the computed date range (minDate..maxDate) produces enough columns
  // to fill the visible chart width. If not, extend maxDate by the required
  // number of time units according to the current viewMode.
  ensureRangeFillsWidth() {
    try {
      // Determine available width for the chart area (excluding sidebar)
      let availableWidth = 0;
      if (this.chartContainer && this.chartContainer.clientWidth) {
        availableWidth = this.chartContainer.clientWidth;
      } else if (this.container && this.container.clientWidth) {
        // Fallback: subtract sidebar if present
        const sidebarW = (this.options.showSidebar && this.sidebarElement) ? this.sidebarElement.offsetWidth : 0;
        availableWidth = Math.max(0, this.container.clientWidth - sidebarW);
      }

      if (!availableWidth || availableWidth <= 0) {
        return; // cannot measure; skip
      }

      // Validate minDate/maxDate
      if (!(this.minDate instanceof Date) || isNaN(this.minDate.getTime()) || !(this.maxDate instanceof Date) || isNaN(this.maxDate.getTime())) {
        return;
      }

      // Current columns based on minDate..maxDate
      let columns = this.getColumns();
      let gridWidth = columns.length * this.options.columnWidth;

      if (gridWidth >= availableWidth) {
        return; // already fills or exceeds
      }

      // Calculate how many additional columns are needed
      const deficit = availableWidth - gridWidth;
      const additionalCols = Math.ceil(deficit / this.options.columnWidth);

      if (additionalCols <= 0) return;

      // Extend maxDate by additional units according to viewMode
      const newMax = new Date(this.maxDate);
      switch (this.viewMode) {
        case 'hour':
          newMax.setHours(newMax.getHours() + additionalCols);
          break;
        case 'day':
          newMax.setDate(newMax.getDate() + additionalCols);
          break;
        case 'week':
          newMax.setDate(newMax.getDate() + 7 * additionalCols);
          break;
        case 'month':
          newMax.setMonth(newMax.getMonth() + additionalCols);
          break;
        default:
          newMax.setDate(newMax.getDate() + additionalCols);
      }

      this.maxDate = newMax;
    } catch (e) {
      // Fail-safe: do nothing if something goes wrong
    }
  }

  getColumns() {
    const columns = [];
    const current = new Date(this.minDate);

    while (current <= this.maxDate) {
      columns.push({
        date: new Date(current),
        text: this.getColumnText(current),
        isWeekend: current.getDay() === 0 || current.getDay() === 6
      });

      this.incrementDate(current);
    }

    return columns;
  }

  incrementDate(date) {
    switch (this.viewMode) {
      case 'hour':
        date.setHours(date.getHours() + 1);
        break;
      case 'day':
        date.setDate(date.getDate() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
    }
  }

  getColumnText(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    switch (this.viewMode) {
      case 'hour':
        return String(date.getHours()).padStart(2, '0');
      case 'day':
        return `${date.getDate()}`;
      case 'week':
        return `W${this.getWeekNumber(date)}`;
      case 'month':
        return months[date.getMonth()];
      default:
        return '';
    }
  }

  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // Header helpers for multi-level context
  getHeaderRowCount() {
    switch (this.viewMode) {
      case 'hour':
      case 'day':
      case 'month':
        return 2; // show parent context row
      case 'week':
      default:
        return 1; // single row
    }
  }

  getTotalHeaderHeight() {
    return this.options.headerHeight * this.getHeaderRowCount();
  }

  getParentHeaderText(date) {
    const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    switch (this.viewMode) {
      case 'hour': {
        // Show Day label for the hour columns
        const d = new Date(date);
        const wd = weekdaysShort[d.getDay()];
        const m = monthsShort[d.getMonth()];
        return `${wd}, ${m} ${d.getDate()}`;
      }
      case 'day': {
        // Show Month + Year for day columns
        const d = new Date(date);
        const m = monthsLong[d.getMonth()];
        return `${m} ${d.getFullYear()}`;
      }
      case 'month': {
        // Show Year for month columns
        return String(new Date(date).getFullYear());
      }
      case 'week':
      default:
        return '';
    }
  }

  drawGrid(columns) {
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.classList.add('gantt-grid');
    const headerH = this.getTotalHeaderHeight();
    const headerOffset = this.headerSvg ? 0 : headerH;

    // Draw rows with alternating colors and group highlighting
    this.visibleTasks.forEach((item, i) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', i * this.options.rowHeight + headerOffset);
      rect.setAttribute('width', columns.length * this.options.columnWidth);
      rect.setAttribute('height', this.options.rowHeight);
      rect.classList.add('gantt-row');

      if (item.type === 'group') {
        rect.classList.add('gantt-group-row');
      }

      gridGroup.appendChild(rect);
    });

    // Draw row lines
    for (let i = 0; i <= this.visibleTasks.length; i++) {
      const y = i * this.options.rowHeight + headerOffset;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 0);
      line.setAttribute('y1', y);
      line.setAttribute('x2', columns.length * this.options.columnWidth);
      line.setAttribute('y2', y);
      line.classList.add('gantt-grid-line');
      gridGroup.appendChild(line);
    }

    // Draw columns and mark special days
    columns.forEach((col, i) => {
      const x = i * this.options.columnWidth;

      // Check if day is marked
      const dateStr = this.dateToString(col.date);
      let markedDay = null;
      this.markedDays.forEach(marked => {
        if (marked.date === dateStr) {
          markedDay = marked;
        }
      });

      // Draw column background for weekends or marked days
      if (col.isWeekend || markedDay) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', headerOffset);
        rect.setAttribute('width', this.options.columnWidth);
        rect.setAttribute('height', this.visibleTasks.length * this.options.rowHeight);
        rect.classList.add('gantt-grid-line');

        if (markedDay) {
          rect.classList.add('gantt-marked-day');
          if (markedDay.color) {
            rect.style.fill = markedDay.color;
          }
        } else {
          rect.classList.add('gantt-weekend');
        }

        gridGroup.appendChild(rect);
      }

      // Draw column line with subtle separation for day/month/year
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', this.visibleTasks.length * this.options.rowHeight + headerOffset);
      line.classList.add('gantt-grid-line');

      // Add boundary classes by view mode
      const d = new Date(col.date);
      const isYearStart = d.getMonth() === 0 && d.getDate() === 1;
      const isMonthStart = d.getDate && d.getDate() === 1;

      if (this.viewMode === 'day' || this.viewMode === 'hour') {
        // Every column is a day/hour; emphasize month/year starts
        if (isYearStart) {
          line.classList.add('gantt-year-separator');
        } else if (isMonthStart) {
          line.classList.add('gantt-month-separator');
        }
      } else if (this.viewMode === 'month') {
        // Each column is a month; emphasize year start (January)
        if (d.getMonth() === 0) {
          line.classList.add('gantt-year-separator');
        }
      } else if (this.viewMode === 'week') {
        // Weeks: keep default lines; optionally emphasize year start when week starts on Jan 1
        if (isYearStart) {
          line.classList.add('gantt-year-separator');
        }
      }

      gridGroup.appendChild(line);
    });

    this.svg.appendChild(gridGroup);
  }

  drawHeader(columns, targetSvg = this.svg) {
    const headerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    headerGroup.classList.add('gantt-header');
    const headerRows = this.getHeaderRowCount();
    const headerH = this.getTotalHeaderHeight();

    // Header background
    const headerBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    headerBg.setAttribute('x', 0);
    headerBg.setAttribute('y', 0);
    headerBg.setAttribute('width', columns.length * this.options.columnWidth);
    headerBg.setAttribute('height', headerH);
    // Use CSS class for theming instead of hardcoded fill
    headerBg.classList.add('gantt-header-bg');
    headerGroup.appendChild(headerBg);

    // Vertical separators in header for alignment with grid
    columns.forEach((col, i) => {
      const x = i * this.options.columnWidth;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', 0);
      line.setAttribute('x2', x);
      line.setAttribute('y2', headerH);
      line.classList.add('gantt-grid-line');
      // Boundary emphasis same rules as grid
      const d = new Date(col.date);
      const isYearStart = d.getMonth() === 0 && d.getDate() === 1;
      const isMonthStart = d.getDate && d.getDate() === 1;
      if (this.viewMode === 'day' || this.viewMode === 'hour') {
        if (isYearStart) {
          line.classList.add('gantt-year-separator');
        } else if (isMonthStart) {
          line.classList.add('gantt-month-separator');
        }
      } else if (this.viewMode === 'month') {
        if (d.getMonth() === 0) {
          line.classList.add('gantt-year-separator');
        }
      } else if (this.viewMode === 'week') {
        if (isYearStart) {
          line.classList.add('gantt-year-separator');
        }
      }
      headerGroup.appendChild(line);
    });

    // Bottom row: individual column labels
    columns.forEach((col, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', i * this.options.columnWidth + this.options.columnWidth / 2);
      text.setAttribute('y', headerH - (this.options.headerHeight / 2) + 5);
      text.setAttribute('text-anchor', 'middle');
      text.classList.add('gantt-header-text');
      text.textContent = col.text;
      headerGroup.appendChild(text);
    });

    // Top row: parent period labels (if applicable)
    if (headerRows > 1) {
      const segments = [];
      let currentLabel = null;
      let startIndex = 0;

      for (let i = 0; i < columns.length; i++) {
        const label = this.getParentHeaderText(columns[i].date);
        if (currentLabel === null) {
          currentLabel = label;
          startIndex = i;
        } else if (label !== currentLabel) {
          segments.push({label: currentLabel, start: startIndex, end: i - 1});
          currentLabel = label;
          startIndex = i;
        }
      }
      if (currentLabel !== null) {
        segments.push({label: currentLabel, start: startIndex, end: columns.length - 1});
      }

      segments.forEach(seg => {
        const startX = seg.start * this.options.columnWidth;
        const width = (seg.end - seg.start + 1) * this.options.columnWidth;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', startX + width / 2);
        text.setAttribute('y', (this.options.headerHeight / 2) + 5);
        text.setAttribute('text-anchor', 'middle');
        text.classList.add('gantt-header-text');
        text.textContent = seg.label;
        headerGroup.appendChild(text);
      });
    }

    targetSvg.appendChild(headerGroup);
  }

  drawTasks(columns) {
    const tasksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    tasksGroup.classList.add('gantt-tasks');
    const headerH = this.getTotalHeaderHeight();
    const headerOffset = this.headerSvg ? 0 : headerH;

    this.visibleTasks.forEach((item, index) => {
      if (item.type === 'task') {
        const task = item.data;
        const taskGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        taskGroup.classList.add('gantt-task');
        taskGroup.setAttribute('data-task-id', task.id);

        const y = index * this.options.rowHeight + headerOffset + 10;
        const height = this.options.rowHeight - 20;

        const startX = this.dateToX(task.start, columns);
        const endX = this.dateToX(task.end, columns);
        const width = Math.max(endX - startX, this.options.taskMinWidth);

        if (task.type === 'milestone') {
          // Draw milestone as diamond
          const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const cx = startX + 15;
          const cy = y + height / 2;
          diamond.setAttribute('points',
            `${cx},${cy - 10} ${cx + 10},${cy} ${cx},${cy + 10} ${cx - 10},${cy}`
          );
          diamond.setAttribute('fill', task.color);
          diamond.classList.add('gantt-milestone');
          taskGroup.appendChild(diamond);
        } else {
          // Task bar
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', startX);
          rect.setAttribute('y', y);
          rect.setAttribute('width', width);
          rect.setAttribute('height', height);
          rect.setAttribute('rx', 4);
          rect.setAttribute('fill', task.color);
          rect.classList.add('gantt-task-bar');
          taskGroup.appendChild(rect);

          // Progress bar
          if (task.progress > 0) {
            const progressRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            progressRect.setAttribute('x', startX);
            progressRect.setAttribute('y', y);
            progressRect.setAttribute('width', width * (task.progress / 100));
            progressRect.setAttribute('height', height);
            progressRect.setAttribute('rx', 4);
            progressRect.setAttribute('fill', task.color);
            progressRect.setAttribute('opacity', 0.5);
            progressRect.classList.add('gantt-task-progress');
            taskGroup.appendChild(progressRect);
          }

          // Task text
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', startX + 10);
          text.setAttribute('y', y + height / 2 + 4);
          text.classList.add('gantt-task-text');
          text.textContent = task.name;
          taskGroup.appendChild(text);
        }

        tasksGroup.appendChild(taskGroup);
      }
    });

    this.svg.appendChild(tasksGroup);
  }

  drawDependencies(columns) {
    const depsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    depsGroup.classList.add('gantt-dependencies');
    const headerH = this.getTotalHeaderHeight();
    const headerOffset = this.headerSvg ? 0 : headerH;

    this.visibleTasks.forEach((item, index) => {
      if (item.type === 'task') {
        const task = item.data;
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            const depTaskIndex = this.visibleTasks.findIndex(
              v => v.type === 'task' && v.data.id === depId
            );

            if (depTaskIndex !== -1) {
              const depTask = this.visibleTasks[depTaskIndex].data;

              const startX = this.dateToX(depTask.end, columns);
              const startY = depTaskIndex * this.options.rowHeight +
                                headerOffset + this.options.rowHeight / 2;

              const endX = this.dateToX(task.start, columns);
              const endY = index * this.options.rowHeight +
                                headerOffset + this.options.rowHeight / 2;

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              const d = `M ${startX} ${startY} 
                                      C ${startX + 20} ${startY}, 
                                        ${endX - 20} ${endY}, 
                                        ${endX} ${endY}`;
              path.setAttribute('d', d);
              path.classList.add('gantt-dependency');
              path.setAttribute('marker-end', `url(#${this.arrowId})`);
              depsGroup.appendChild(path);
            }
          });
        }
      }
    });

    this.svg.appendChild(depsGroup);
  }

  dateToX(date, columns) {
    const totalDuration = this.maxDate - this.minDate;
    const dateDuration = date - this.minDate;
    const ratio = dateDuration / totalDuration;
    return ratio * columns.length * this.options.columnWidth;
  }

  xToDate(x, columns) {
    const ratio = x / (columns.length * this.options.columnWidth);
    const totalDuration = this.maxDate - this.minDate;
    const dateDuration = ratio * totalDuration;
    return new Date(this.minDate.getTime() + dateDuration);
  }

  dateToString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  getMarkedDayColor(type) {
    const colors = {
      'holiday': '#ff7675',
      'event': '#74b9ff',
      'special': '#fdcb6e',
      'weekend': '#ffeaa7'
    };
    return colors[type] || '#dfe6e9';
  }

  // Event Handlers

  handleMouseDown(e) {
    const taskElement = e.target.closest('.gantt-task');
    if (taskElement && this.options.enableDragDrop) {
      const taskId = taskElement.getAttribute('data-task-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task && task.type !== 'milestone') {
        this.dragging = {
          task: task,
          element: taskElement,
          startX: e.clientX,
          originalStart: new Date(task.start),
          originalEnd: new Date(task.end)
        };

        taskElement.classList.add('gantt-dragging');
        e.preventDefault();
      }
    }
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const taskElement = e.target.closest('.gantt-task');

    if (taskElement && this.options.enableDragDrop) {
      const taskId = taskElement.getAttribute('data-task-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task && task.type !== 'milestone') {
        this.dragging = {
          task: task,
          element: taskElement,
          startX: touch.clientX,
          originalStart: new Date(task.start),
          originalEnd: new Date(task.end)
        };

        taskElement.classList.add('gantt-dragging');
        e.preventDefault();
      }
    }
  }

  handleMouseMove(e) {
    if (this.dragging) {
      const deltaX = e.clientX - this.dragging.startX;
      const columns = this.getColumns();

      const duration = this.dragging.originalEnd - this.dragging.originalStart;
      const newStart = this.xToDate(
        this.dateToX(this.dragging.originalStart, columns) + deltaX,
        columns
      );
      const newEnd = new Date(newStart.getTime() + duration);

      this.dragging.task.start = newStart;
      this.dragging.task.end = newEnd;

      this.render();
      this.emit('taskDrag', {
        task: this.dragging.task,
        start: newStart,
        end: newEnd
      });
    }
  }

  handleTouchMove(e) {
    if (this.dragging) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.dragging.startX;
      const columns = this.getColumns();

      const duration = this.dragging.originalEnd - this.dragging.originalStart;
      const newStart = this.xToDate(
        this.dateToX(this.dragging.originalStart, columns) + deltaX,
        columns
      );
      const newEnd = new Date(newStart.getTime() + duration);

      this.dragging.task.start = newStart;
      this.dragging.task.end = newEnd;

      this.render();
      this.emit('taskDrag', {
        task: this.dragging.task,
        start: newStart,
        end: newEnd
      });

      e.preventDefault();
    }
  }

  handleMouseUp(e) {
    if (this.dragging) {
      this.dragging.element.classList.remove('gantt-dragging');

      this.emit('taskDrop', {
        task: this.dragging.task,
        start: this.dragging.task.start,
        end: this.dragging.task.end,
        originalStart: this.dragging.originalStart,
        originalEnd: this.dragging.originalEnd
      });

      this.dragging = null;
      this.render();
    }
  }

  handleTouchEnd(e) {
    if (this.dragging) {
      this.dragging.element.classList.remove('gantt-dragging');

      this.emit('taskDrop', {
        task: this.dragging.task,
        start: this.dragging.task.start,
        end: this.dragging.task.end,
        originalStart: this.dragging.originalStart,
        originalEnd: this.dragging.originalEnd
      });

      this.dragging = null;
      this.render();
    }
  }

  handleClick(e) {
    const taskElement = e.target.closest('.gantt-task');
    if (taskElement) {
      const taskId = taskElement.getAttribute('data-task-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task) {
        this.emit('taskClick', task);
      }
    }
  }

  handleMouseOver(e) {
    const taskElement = e.target.closest('.gantt-task');
    if (taskElement) {
      const taskId = taskElement.getAttribute('data-task-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task) {
        this.emit('taskMouseOver', {task, event: e});
      }
    }
  }

  handleMouseOut(e) {
    const taskElement = e.target.closest('.gantt-task');
    if (taskElement) {
      const taskId = taskElement.getAttribute('data-task-id');
      const task = this.tasks.find(t => t.id === taskId);

      if (task) {
        this.emit('taskMouseOut', {task, event: e});
      }
    }
  }

  generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
  }
}

// Export version
export const version = '1.0.0';

// Default export
export { GanttChart };
