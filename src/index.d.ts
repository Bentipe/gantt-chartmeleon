// src/index.d.ts

export interface GanttOptions {
    viewMode?: 'hour' | 'day' | 'week' | 'month';
    minDate?: Date | string | null;
    maxDate?: Date | string | null;
    rowHeight?: number;
    headerHeight?: number;
    columnWidth?: number;
    taskMinWidth?: number;
    enableDragDrop?: boolean;
    showSidebar?: boolean;
    sidebarWidth?: number;
    sidebarTitle?: string;
    locale?: string;
    dateFormat?: string;
    timeFormat?: string;
    theme?: 'default' | 'dark' | string;
}

export interface Segment {
    id?: string;
    name?: string;
    start: Date | string;
    end: Date | string;
    color?: string;
    metadata?: Record<string, any>;
    className?: string; // custom CSS class(es) applied to this segment's SVG group
    style?: string | Record<string, string | number>; // inline style for the segment's SVG group
}

export interface Task {
    id?: string;
    name: string;
    start: Date | string;
    end: Date | string;
    segments?: Segment[]; // Optional: provide multiple segments; if omitted, start/end seed a single segment
    progress?: number;
    color?: string;
    textColor?: string;
    dependencies?: string[];
    group?: string | null;
    workOrder?: string;
    assignee?: string;
    type?: 'task' | 'milestone';
    metadata?: Record<string, any>;
}

export interface Group {
    id?: string;
    name: string;
    workOrder?: string;
    color?: string;
    metadata?: Record<string, any>;
    parent?: string | null;
}

export interface MarkedDay {
    date: string;
    type: string;
    color?: string;
}

export interface VisibleItem {
    type: 'task' | 'group';
    data: Task | Group;
    depth?: number;
}

export interface DragEventData {
    task: Task;
    start: Date;
    end: Date;
}

export interface DropEventData extends DragEventData {
    originalStart: Date;
    originalEnd: Date;
}

export interface MouseEventData {
    task: Task;
    event: MouseEvent;
}

export interface DateRange {
    start: Date;
    end: Date;
}

export type EventCallback<T = any> = (data: T) => void;

export interface EventMap {
    // Task events
    tasksSet: EventCallback<{ tasks: Task[]; groups: Group[] }>;
    taskAdd: EventCallback<Task>;
    taskUpdate: EventCallback<Task>;
    taskRemove: EventCallback<Task>;
    taskClick: EventCallback<Task>;
    taskDrag: EventCallback<DragEventData>;
    taskDrop: EventCallback<DropEventData>;
    taskMouseOver: EventCallback<MouseEventData>;
    taskMouseOut: EventCallback<MouseEventData>;

    // Group events
    groupAdd: EventCallback<Group>;
    groupRemove: EventCallback<Group>;
    groupClick: EventCallback<Group>;
    groupExpand: EventCallback<string>;
    groupCollapse: EventCallback<string>;
    expandAll: EventCallback<void>;
    collapseAll: EventCallback<void>;

    // View events
    viewModeChange: EventCallback<string>;
    zoomChange: EventCallback<{ columnWidth: number }>;

    // Day marking events
    dayMarked: EventCallback<{ date: string; type: string; color?: string }>;
    dayUnmarked: EventCallback<{ date: string }>;
    markedDaysCleared: EventCallback<void>;

    // Dependencies
    dependenciesSet: EventCallback<any[]>;

    // Lifecycle
    destroy: EventCallback<void>;
}

export declare class GanttChart {
    constructor(container: string | HTMLElement, options?: GanttOptions);

    // Properties
    readonly container: HTMLElement;
    readonly options: Required<GanttOptions>;
    readonly tasks: Task[];
    readonly groups: Group[];
    readonly dependencies: any[];
    readonly markedDays: Set<MarkedDay>;
    readonly collapsedGroups: Set<string>;
    readonly visibleTasks: VisibleItem[];
    viewMode: 'hour' | 'day' | 'week' | 'month';

    // Task Management
    setTasks(tasks: Task[], groups?: Group[]): void;
    addTask(task: Task): Task;
    updateTask(taskId: string, updates: Partial<Task>): Task | null;
    removeTask(taskId: string): Task | null;
    getTask(taskId: string): Task | null;
    getTasks(): Task[];

    // Group Management
    addGroup(group: Group): Group;
    removeGroup(groupId: string): Group | null;
    toggleGroup(groupId: string): void;
    expandAll(): void;
    collapseAll(): void;
    getGroup(groupId: string): Group | null;
    getGroups(): Group[];

    // View Management
    setViewMode(mode: 'hour' | 'day' | 'week' | 'month'): void;
    getVisibleTasks(): VisibleItem[];
    getDateRange(): DateRange;

    // Zoom
    getZoom(): number;
    setZoom(columnWidth: number): void;
    zoomIn(step?: number): void;
    zoomOut(step?: number): void;

    // Day Marking
    markDay(date: Date | string, type?: string, color?: string | null): void;
    unmarkDay(date: Date | string): void;
    clearMarkedDays(): void;

    // Dependencies
    setDependencies(dependencies: any[]): void;

    // Event System
    on<K extends keyof EventMap>(event: K, callback: EventMap[K]): this;
    on(event: string, callback: EventCallback): this;

    off<K extends keyof EventMap>(event: K, callback?: EventMap[K]): this;
    off(event: string, callback?: EventCallback): this;

    emit<K extends keyof EventMap>(event: K, data?: Parameters<EventMap[K]>[0]): void;
    emit(event: string, data?: any): void;

    // Lifecycle
    destroy(): void;

    // Rendering
    render(): void;
}

export declare const version: string;

export default GanttChart;
