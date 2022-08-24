
/* Due to time issues, Tasks integration isn't finished :( */

const DateTime = luxon.DateTime
let USER = null
let STUDYLOG = null
let TASKS = null
let TIMER = {
    studyseconds: 30*60,
    breakseconds: 5*60,
    pomodoros: 5,
    actualTime: 0,
    actualPomo: 1,
    timerPaused: true,
    status: 'unset'
}

class Task {
    constructor(title = 'Undefined', desc = '', prio = 0, date = '', done = false) {
        this.title = title
        this.description = desc
        this.priority = prio // Higher number higher prio
        this.date = date
        this.done = done
    }
}

/**
 * Fetch data from all users in JSONPlaceholder and all data from the local studylog
 * 
 * @async
 * @function fetchUsersAndData
 * @return {Array}      Array that contains all user data first and all study records in second place.
 */
async function fetchUsersAndData(){
    const [users, completeStudylog] = await Promise.all([
        fetch('https://jsonplaceholder.typicode.com/users'),
        fetch('./assets/users-studylog.json')
    ])

    return await Promise.all([
        users.json(),
        completeStudylog.json()
    ])
}

/**
 * Fetch data from a specific user and store it in global varibles and local storage.
 * 
 * @async
 * @function fetchUserData
 * @param {number} id - User id.
 * @return {boolean}  Returns true if data is loaded correctly, otherwise returns false (e.g. when user isn't finded).
 */
async function fetchUserData(id){
    const [users, completeStudylog] = await fetchUsersAndData()
    const userdata = users.find(user => {return user.id == id})
    if (userdata != undefined){
        const studylog = completeStudylog.filter(log => log.id == id)
        // The following line is because JSONPlaceholder doesn't have a studytime prop! 
        const totalstudytime = studylog.map(log => log.studytime).reduce((acc, cur) => acc + cur,0)
        userdata.studytime = totalstudytime
        USER = userdata
        STUDYLOG = studylog
        saveAllUserData()
        return true
    }
    return false
}

/**
 * Saves user data to local storage and post it to the database.
 * 
 * @function saveAllUserData
 */
function saveAllUserData(){
    localStorage.setItem('user', JSON.stringify(USER))
    localStorage.setItem('studylog', JSON.stringify(STUDYLOG))
    localStorage.setItem('tasks', JSON.stringify(TASKS))
    // POST USER TO API. In this code I'm not posting cause JSONPlaceholder doesn´t allowed it.
    // Tasks are storaged in the browser, not the API.
}

/**
 * Loads user data from local storage to global variables. If data isn't found, the function will store an anonymus user.
 * 
 * @function loadUserData
 */
function loadUserData(){
    USER = JSON.parse(localStorage.getItem('user')) ?? {id:0, name: "Unindentified User", username: "anonymus", studytime: 0}
    STUDYLOG = JSON.parse(localStorage.getItem('studylog')) ?? []
    TASKS = JSON.parse(localStorage.getItem('tasks')) ?? []
}

/**
 * Posts main user stadistics to DOM.
 * 
 * @function updateUserdataDOM
 */
function updateUserdataDOM(){
    const userdataDIV = document.getElementById('userdata')
    const userdataStatsDIV = userdataDIV.firstElementChild
    let data = 
        `
        <h2>Welcome, ${USER.name}</h2/>
        <h3>Total Study Time</h3>
        <p>${USER.studytime}</p>
        `
    if (STUDYLOG.length){
        const laststudy = STUDYLOG[STUDYLOG.length-1]
        const date = DateTime.fromISO(laststudy.date).toLocaleString({ month: 'long', day: 'numeric' })
        data += 
            `
            <p>Last study session recorded was on ${date} with a total of ${printTime(laststudy.studytime)} studied!</p>
            <p>Keep on going, you are doing great!</p>
            `
    }
    userdataStatsDIV.innerHTML = data
}

/** 
 * Function to excecute when Log In button is clicked.
 * Loads all user data and stores it to local storage for future access.
 *  
 * @async
 * @function login
 */
async function login(){
    const { value: userid } = await Swal.fire({
        title: 'Log In',
        input: 'text',
        inputLabel: 'Enter your account ID to save your progress',
        showCancelButton: true,
        inputValidator: (value) => {
        if (!value) {
            return 'You need to write something!'
        }
        if (!/^[0-9]+$/.test(value)){
            return 'You have entered a wrong character!'
        }
        },
    })
    const done = await fetchUserData(userid)
    if (done){
        Swal.fire({
            title: 'Logged in successfully!',
            timer: 1500,
            icon: 'success',
            showDenyButton: false,
            showConfirmButton: false,
            showCancelButton: false,
            timerProgressBar: false,
          })
        updateUserdataDOM()
        const userdataDIV = document.getElementById('userdata')
        const userdataControlsDIV = userdataDIV.lastElementChild
        userdataControlsDIV.innerHTML = `<button type='button' id='logout'>Log Out</button>`
        document.getElementById('logout').addEventListener('click', logout)
    }
    else{
        Swal.fire({
            title: 'User ID doesn\'t exists',
            timer: 1500,
            icon: 'error',
            showDenyButton: false,
            showConfirmButton: false,
            showCancelButton: false,
            timerProgressBar: false,
        })
    }
}

/**
 * Function to excecute when Log Out button is clicked.
 * Removes all user data from vars and local storage.
 * 
 * @async
 * @function logout
 */
async function logout(){
    Swal.fire({
        title: 'Are you sure?',
        text: "If you close your account, data won't be saved anymore!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Log out'
    })
    .then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: `Goodbye, ${USER.name}`,
                timer: 2000,
                icon: 'success',
                showDenyButton: false,
                showConfirmButton: false,
                showCancelButton: false,
                timerProgressBar: false,
            })
            const userdataDIV = document.getElementById('userdata')
            const userdataControlsDIV = userdataDIV.lastElementChild
            userdataControlsDIV.innerHTML = `<button type='button' id='login'>Log In</button>`
            document.getElementById('login').addEventListener('click', login)
            USER = {id:0, name: 'Unindentified User', username: 'anonymus', studytime: 0}
            STUDYLOG = []
            saveAllUserData()
            updateUserdataDOM()
        }
    })
}

/**
 * Function that recieves seconds and prints them as a clock.
 * 
 * @function printTime
 * @param {number} Amount of seconds to parse 
 * @returns {string} Time string with hh:mm:ss format
 */
function printTime(seconds) {
    const extractHours = (seconds) => Math.floor(seconds / 3600)
    const extractMinutes = (seconds) => Math.floor((seconds % 3600) / 60)
    const extractSeconds = (seconds) => (seconds % 3600) % 60

    const hours = extractHours(seconds).toString().padStart(2, "0")
    const min = extractMinutes(seconds).toString().padStart(2, "0")
    const sec = extractSeconds(seconds).toString().padStart(2, "0")
    return hours + ":" + min + ":" + sec
}

/**
 * Function that manages time of a pomodoro clock.
 * 
 * @function manageTime 
 */
function manageTime(){
    let timerTitle = document.querySelector('.pomodoro__title')
    let timerSubtitle = document.querySelector('.pomodoro__subtitle')
    let timerTime = document.querySelector('.pomodoro__time')
    if (TIMER.status == 'unset'){
        TIMER.status = 'study'
        TIMER.actualTime = TIMER.studyseconds
        timerTitle.innerText = 'Studying!'
        timerSubtitle.innerText = 'Pomodoro ' + TIMER.actualPomo
        STUDYLOG.push({
            id: USER.id,
            studytime: 0,
            date: DateTime.now().toFormat('yyyy-MM-dd')
        })
    }
    else{
        if (TIMER.actualTime == 0){
            // Study timer has finished so the break needs to be config
            if (TIMER.status == 'study'){
                // Study has finished!
                if (TIMER.actualPomo == TIMER.pomodoros){
                    resetTimer()
                    document.querySelector('.pomodoro__title').innerText = 'Good Job!'
                    document.querySelector('.pomodoro__subtitle').innerText = 'Total time studied'
                    document.querySelector('.pomodoro__time').innerText = printTime(TIMER.studyseconds * TIMER.pomodoros)
                    document.getElementById('playpause').innerHTML = `<i class='bi bi-arrow-counterclockwise'></i>`
                    return
                }
                // Study hasn't finished...
                else{
                    TIMER.status = 'break'
                    TIMER.actualTime = TIMER.breakseconds
                    timerTitle.innerText = 'Break!'
                    USER.totalstudytime += TIMER.studyseconds
                    saveAllUserData()
                }
            }
            // Break timer has finished so the study needs to be config
            else{
                TIMER.status = 'study'
                TIMER.actualTime = TIMER.studyseconds
                TIMER.actualPomo++
                timerTitle.innerText = 'Studying!'
                timerSubtitle.innerText = 'Pomodoro ' + TIMER.actualPomo
            }
        }
    }
    TIMER.actualTime--
    if (TIMER.status == 'study'){
        STUDYLOG[STUDYLOG.length - 1].studytime++
        USER.totalstudytime++
    }
    saveAllUserData()
    timerTime.innerText = printTime(TIMER.actualTime)
}

/**
 * Function that resets the pomodoro timer.
 * It resets the DOM and internal variables
 * 
 * @function resetTimer
 */
function resetTimer(){
    clearInterval(TIMER.timerPaused)
    TIMER.actualPomo = 1
    TIMER.actualTime = 0
    TIMER.timerPaused = true
    TIMER.status = 'unset'
    document.getElementById('pomodoro').innerHTML = 
        `
        <section id='pomodoro'>
            <h2 class="pomodoro__title">Time to study!</h2>
            <h3 class="pomodoro__subtitle">Start Pomodoro</h3>
            <p class="pomodoro__time">00:00:00</p>
            <div class='pomodoro__controls'>
                <button id='playpause'><i class='bi bi-play-fill'></i></button>
            </div>
        </section>
        `
    document.getElementById('playpause').addEventListener('click', playpauseTimer)
}

/**
 * Function that allows to play or pause the pomodoro timer.
 * 
 * @function playpauseTimer
 */
function playpauseTimer(){
    if (TIMER.timerPaused == true) {
        TIMER.timerPaused = setInterval(() => manageTime(), 1000)
        document.querySelector('#pomodoro .pomodoro__controls').innerHTML=
            `
            <button id='playpause'><i class='bi bi-pause-fill'></i></button>
            <button id='reset'><i class='bi bi-arrow-counterclockwise'></i></button>
            `
            document.getElementById('playpause').addEventListener('click', playpauseTimer)
            document.getElementById('reset').addEventListener('click', resetTimer)
            
    }
    else {
        clearInterval(TIMER.timerPaused)
        TIMER.timerPaused = true
        document.getElementById('playpause').innerHTML = `<i class='bi bi-play-fill'>`
    }
}

window.addEventListener('load', () =>{
    loadUserData()
    updateUserdataDOM()
    // User ID 0 indicates anonymus user...
    const userdataDIV = document.getElementById('userdata')
    const userdataControlsDIV = userdataDIV.lastElementChild
    if (USER.id == 0){
        userdataControlsDIV.innerHTML = `<button id='login'>Log In</button>`
        document.getElementById('login').addEventListener('click', login)
    }
    else{
        userdataControlsDIV.innerHTML = `<button type='button' id='logout'>Log Out</button>`
        document.getElementById('logout').addEventListener('click', logout)
    }
    document.getElementById('playpause').addEventListener('click', playpauseTimer)
})