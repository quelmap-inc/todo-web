// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzaSyAZBiRvlvJB16cGHpPoiYAHrUtVW1noZ64",
    authDomain: "todo-a8c76.firebaseapp.com",
    projectId: "todo-a8c76",
    storageBucket: "todo-a8c76.appspot.com",
    messagingSenderId: "194874799279",
    appId: "1:194874799279:web:fa7f04d5d044e3be9cd05a",
    databaseURL: "https://todo-a8c76-default-rtdb.firebaseio.com/"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let currentProject = null;

// プロジェクトの取得と表示
function getProjects() {
    database.ref('projects').on('value', (snapshot) => {
        const projects = snapshot.val();
        displayProjects(projects);
    });
}

// プロジェクトの表示
function displayProjects(projects) {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    for (let id in projects) {
        const project = projects[id];
        const projectEl = document.createElement('li');
        projectEl.textContent = project.name;
        projectEl.addEventListener('click', () => selectProject(id));
        projectList.appendChild(projectEl);
    }
    selectProject(Object.keys(projects)[0]);
}

// プロジェクトの選択
function selectProject(projectId) {
    currentProject = projectId;
    database.ref(`projects/${projectId}`).once('value', (snapshot) => {
        const project = snapshot.val();
        document.getElementById('current-project-name').textContent = project.name;
        getTasks(projectId);
    });
}

// タスクの取得と表示
function getTasks(projectId) {
    database.ref(`tasks/${projectId}`).on('value', (snapshot) => {
        const tasks = snapshot.val();
        displayTasks(tasks);
    });
}

// タスクの表示
function displayTasks(tasks) {
    const columns = ['todo', 'doing', 'done'];
    columns.forEach(column => {
        const columnEl = document.getElementById(`${column}-tasks`);
        columnEl.innerHTML = '';
    });

    if (tasks) {
        for (let id in tasks) {
            const task = tasks[id];
            const taskEl = createTaskElement(id, task);
            document.getElementById(`${task.status}-tasks`).appendChild(taskEl);
        }
    }

    updateDependencyOptions();
}

// タスク要素の作成
function createTaskElement(id, task) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task';
    taskEl.id = id;
    taskEl.draggable = true;

    const remainingDays = getRemainingDays(task.deadline);
    const dependencyTask = task.dependency ? getTaskById(task.dependency) : null;
    const isDependencyCompleted = dependencyTask ? dependencyTask.status === 'done' : true;

    const memberIcon = task.member ? `<span class="member-icon ${task.member}"></span>` : '';

    taskEl.innerHTML = `
        <h3>${task.title} ${memberIcon}</h3>
        <p>期限: ${remainingDays}</p>
        <p>依存タスク: ${dependencyTask ? dependencyTask.title : 'なし'}</p>
        <button class="edit-button" onclick="showEditTaskForm('${id}')">編集</button>
    `;

    if (!isDependencyCompleted) {
        taskEl.classList.add('disabled');
        taskEl.draggable = false;
    }

    taskEl.addEventListener('dragstart', drag);
    return taskEl;
}

//タスクの削除
function deleteTask(){
    const taskId = document.getElementById('edit-task-form').dataset.taskId;
    //domから削除
    document.getElementById(taskId).remove();
    //firebaseから削除
    database.ref(`tasks/${currentProject}/${taskId}`).remove();
    hideEditTaskForm();
}

// 残り日数の計算
function getRemainingDays(deadline) {
    if (!deadline) return '未設定';
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `残り${diffDays}日`;
}

// タスクIDからタスクを取得
function getTaskById(taskId) {
    let task = null;
    database.ref(`tasks/${currentProject}/${taskId}`).once('value', (snapshot) => {
        task = snapshot.val();
    });
    return task;
}

// 依存タスクオプションの更新
function updateDependencyOptions() {
    const select = document.getElementById('task-dependency');
    const editSelect = document.getElementById('edit-task-dependency');
    select.innerHTML = '<option value="">依存タスクなし</option>';
    editSelect.innerHTML = '<option value="">依存タスクなし</option>';
    if (currentProject) {
        database.ref(`tasks/${currentProject}`).once('value', (snapshot) => {
            const tasks = snapshot.val();
            if (tasks) {
                for (let id in tasks) {
                    const option = document.createElement('option');
                    const editOption = document.createElement('option');
                    option.value = id;
                    editOption.value = id;
                    option.textContent = tasks[id].title;
                    editOption.textContent = tasks[id].title;
                    select.appendChild(option);
                    editSelect.appendChild(editOption);
                }
            }
        });
    }
}

// タスク追加フォームの表示
function showAddTaskForm(status) {
    document.getElementById('add-task-form').style.display = 'block';
    document.getElementById('add-task-form').dataset.status = status;
}

// タスク追加フォームの非表示
function hideAddTaskForm() {
    document.getElementById('add-task-form').style.display = 'none';
}

// タスクの追加
function addTask() {
    const title = document.getElementById('task-title').value;
    const deadline = document.getElementById('task-deadline').value;
    const dependency = document.getElementById('task-dependency').value;
    const member = document.getElementById('task-member').value;
    const status = document.getElementById('add-task-form').dataset.status;

    if (title && currentProject) {
        const newTaskRef = database.ref(`tasks/${currentProject}`).push();
        newTaskRef.set({
            title: title,
            deadline: deadline,
            dependency: dependency,
            member: member,
            status: status
        });

        document.getElementById('task-title').value = '';
        document.getElementById('task-deadline').value = '';
        document.getElementById('task-dependency').value = '';
        document.getElementById('task-member').value = '';
        hideAddTaskForm();
    }
}

// タスク編集フォームの表示
function showEditTaskForm(taskId) {
    document.getElementById('edit-task-form').style.display = 'block';
    document.getElementById('edit-task-form').dataset.taskId = taskId;

    database.ref(`tasks/${currentProject}/${taskId}`).once('value', (snapshot) => {
        const task = snapshot.val();
        document.getElementById('edit-task-title').value = task.title;
        document.getElementById('edit-task-deadline').value = task.deadline;
        document.getElementById('edit-task-dependency').value = task.dependency;
        document.getElementById('edit-task-member').value = task.member;
    });
}

// タスク編集フォームの非表示
function hideEditTaskForm() {
    document.getElementById('edit-task-form').style.display = 'none';
}

// タスクの更新
function updateTask() {
    const taskId = document.getElementById('edit-task-form').dataset.taskId;
    const title = document.getElementById('edit-task-title').value;
    const deadline = document.getElementById('edit-task-deadline').value;
    const dependency = document.getElementById('edit-task-dependency').value;
    const member = document.getElementById('edit-task-member').value;

    if (title && currentProject) {
        database.ref(`tasks/${currentProject}/${taskId}`).update({
            title: title,
            deadline: deadline,
            dependency: dependency,
            member: member
        });

        hideEditTaskForm();
    }
}

// ドラッグ開始
function drag(event) {
    if (!event.target.classList.contains('disabled')) {
        event.dataTransfer.setData('text', event.target.id);
    }
}

// ドラッグオーバー
function allowDrop(event) {
    event.preventDefault();
    if (event.target.classList.contains('task-list')) {
        event.target.style.backgroundColor = '#e0e0e0';
    }
}

// ドラッグリーブ
function dragLeave(event) {
    if (event.target.classList.contains('task-list')) {
        event.target.style.backgroundColor = '';
    }
}

// ドロップ
function drop(event) {
    event.preventDefault();
    targetlist=findTaskListElement(event.target);
    if (targetlist) {
        targetlist.style.backgroundColor = '';
        const taskId = event.dataTransfer.getData('text');
        const newStatus = targetlist.id.replace('-tasks', '');

        // 依存関係のチェック
        database.ref(`tasks/${currentProject}/${taskId}`).once('value', (snapshot) => {
            const task = snapshot.val();
            if (task.dependency) {
                database.ref(`tasks/${currentProject}/${task.dependency}`).once('value', (dependencySnapshot) => {
                    const dependencyTask = dependencySnapshot.val();
                    if (dependencyTask.status !== 'done') {
                        alert('依存タスクが完了していないため、このタスクは移動できません。');
                        return;
                    }
                    updateTaskStatus(taskId, newStatus);
                });
            } else {
                updateTaskStatus(taskId, newStatus);
            }
        });
    }
    // ドロップ先のdomがtask-listクラスを持たない場合、そのdomの親にtask-listクラスを持つ要素がないのかを再帰的に調べる
    function findTaskListElement(element) {
        if (element.classList.contains('task-list')) {
            return element;
        } else if (element.parentElement.classList.contains('column')) {
            return element.find(".task-list");
        }else if (element.parentElement) {
            return findTaskListElement(element.parentElement);
        } else {
            return null;
        }
    }
}

// タスクのステータス更新
function updateTaskStatus(taskId, newStatus) {
    database.ref(`tasks/${currentProject}/${taskId}`).update({ status: newStatus });
}

// プロジェクト追加フォームの表示
function showAddProjectForm() {
    document.getElementById('add-project-form').style.display = 'block';
}

// プロジェクト追加フォームの非表示
function hideAddProjectForm() {
    document.getElementById('add-project-form').style.display = 'none';
}

// プロジェクトの追加
function addProject() {
    const projectName = document.getElementById('project-name').value;

    if (projectName) {
        const newProjectRef = database.ref('projects').push();
        newProjectRef.set({
            name: projectName
        });

        document.getElementById('project-name').value = '';
        hideAddProjectForm();
    }
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    getProjects();
    const columns = ['todo', 'doing', 'done'];
    columns.forEach(column => {
        const columnEl = document.getElementById(`${column}-tasks`);
        columnEl.addEventListener('dragover', allowDrop);
        columnEl.addEventListener('dragleave', dragLeave);
        columnEl.addEventListener('drop', drop);
    });
});