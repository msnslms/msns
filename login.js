import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgg7n1LwcrRiV2kjgSM5E3XX27twweMg8",
  authDomain: "msns-79.firebaseapp.com",
  projectId: "msns-79",
  storageBucket: "msns-79.firebasestorage.app",
  messagingSenderId: "108137376740",
  appId: "1:108137376740:web:78ed2f442c035a072f75f1",
  measurementId: "G-3GTFJKTS7D"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentMode = "login"; // 'login' or 'register'
let currentRole = "student"; // 'student', 'teacher', 'old_student'
let generatedCaptcha = "";

// Security CAPTCHA Generator
window.generateCaptcha = function() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedCaptcha = code;
    const disp = document.getElementById("captchaCodeDisplay");
    if (disp) disp.textContent = code;
    
    const input = document.getElementById("captchaInput");
    if (input) input.value = "";
    
    const status = document.getElementById("captchaStatus");
    if (status) { status.textContent = ""; status.className = "captcha-status"; }
};

document.addEventListener("DOMContentLoaded", () => {
    generateCaptcha();
    
    document.getElementById("captchaInput")?.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        const status = document.getElementById("captchaStatus");
        if (!status) return;
        if (val.toLowerCase() === generatedCaptcha.toLowerCase()) {
            status.textContent = "VERIFIED ✓";
            status.className = "captcha-status valid";
        } else {
            status.textContent = "";
            status.className = "captcha-status";
        }
    });
});

window.switchAuthMode = function(mode) {
    currentMode = mode;
    document.getElementById("tabLogin").classList.toggle("active", mode === "login");
    document.getElementById("tabRegister").classList.toggle("active", mode === "register");
    document.getElementById("regExtraFields").style.display = (mode === "register") ? "block" : "none";
    document.getElementById("submitBtnText").textContent = (mode === "register") ? "Create Account" : "Log In";
};

window.selectRole = function(role) {
    currentRole = role;
    document.getElementById("btnStudent").classList.toggle("active", role === "student");
    document.getElementById("btnTeacher").classList.toggle("active", role === "teacher");
    document.getElementById("btnOldStudent").classList.toggle("active", role === "old_student");

    const idxGroup = document.getElementById("indexNoGroup");
    if (idxGroup) {
        idxGroup.style.display = (role === "teacher") ? "none" : "block";
    }
};

function showAlert(message, type = "error") {
    const alertBox = document.getElementById("authAlert");
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = `auth-alert ${type}`;
        alertBox.classList.remove("hidden");
    }
}

// Check Index Number Uniqueness in Firestore
async function isIndexNumberTaken(indexNo) {
    if (!indexNo) return false;
    const q = query(collection(db, "users"), where("indexNo", "==", indexNo.trim()));
    const snap = await getDocs(q);
    return !snap.empty;
}

window.handleAuthSubmit = async function(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const userCaptcha = document.getElementById("captchaInput").value.trim();

    if (userCaptcha.toLowerCase() !== generatedCaptcha.toLowerCase()) {
        showAlert("Security CAPTCHA Code එක වැරදියි! නැවත උත්සාහ කරන්න.", "error");
        generateCaptcha();
        return;
    }

    try {
        if (currentMode === "register") {
            const fullName = document.getElementById("regFullName").value.trim();
            const indexNo = document.getElementById("regIndexNo")?.value.trim() || "";

            if (!fullName) { showAlert("කරුණාකර සම්පූර්ණ නම ඇතුළත් කරන්න.", "error"); return; }

            if (currentRole !== "teacher" && indexNo) {
                const isTaken = await isIndexNumberTaken(indexNo);
                if (isTaken) {
                    showAlert("මෙම Index Number එක දැනටමත් වෙනත් අයෙකු භාවිත කර ඇත! කරුණාකර නිවැරදි Index Number එක යොදන්න.", "error");
                    return;
                }
            }

            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", cred.user.uid), {
                uid: cred.user.uid,
                displayName: fullName,
                email: email,
                role: currentRole,
                indexNo: indexNo,
                indexLocked: indexNo ? true : false,
                baseGrade: currentRole === "student" ? "6" : "",
                studentClass: currentRole === "student" ? "Class A" : "",
                createdAt: new Date().toISOString()
            });

            showAlert("ලියාපදිංචිය සාර්ථකයි! යොමු වෙමින් පවතී...", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, password);
            showAlert("ලොග් වීම සාර්ථකයි! යොමු වෙමින් පවතී...", "success");
        }

        setTimeout(() => { window.location.href = "u.html"; }, 1000);

    } catch (err) {
        showAlert("දෝෂයකි: " + err.message, "error");
        generateCaptcha();
    }
};

window.handleGoogleAuth = async function() {
    const userCaptcha = document.getElementById("captchaInput").value.trim();
    if (userCaptcha.toLowerCase() !== generatedCaptcha.toLowerCase()) {
        showAlert("Google Sign-In කිරීමට ප්‍රථම Security Code එක සම්පූර්ණ කරන්න.", "error");
        return;
    }

    const provider = new GoogleAuthProvider();
    try {
        const res = await signInWithPopup(auth, provider);
        const user = res.user;
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || user.email.split("@")[0],
                email: user.email,
                photoURL: user.photoURL || "",
                role: currentRole,
                indexNo: "",
                indexLocked: false,
                baseGrade: currentRole === "student" ? "6" : "",
                createdAt: new Date().toISOString()
            });
        }
        window.location.href = "u.html";
    } catch (err) {
        showAlert("Google Auth දෝෂයකි: " + err.message, "error");
    }
};

