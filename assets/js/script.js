// Initialize Supabase client
// if (typeof supabase !== "undefined") {
    const client = supabase.createClient(
        "https://qosnxyddoaahlajvefra.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvc254eWRkb2FhaGxhanZlZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDc4ODksImV4cCI6MjA3OTAyMzg4OX0.hlDK_sAMcwFuM6DRZLhQCwCRi9mlvDRA5su5eXEY8dE"
    );
// }


// ---------- LOADER HELPERS (used across pages) ----------
function showLoader() {
    // index uses #premiumLoader; dashboard uses #appLoader
    const p = document.getElementById('premiumLoader');
    const a = document.getElementById('appLoader');
    if (p) p.style.display = 'flex';
    if (a) a.style.display = 'flex';
}
function hideLoader() {
    const p = document.getElementById('premiumLoader');
    const a = document.getElementById('appLoader');
    if (p) p.style.display = 'none';
    if (a) a.style.display = 'none';
}

async function registerUser() {
    const name = document.getElementById("regName").value.trim();
    const mobile = document.getElementById("regMobile").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value.trim();
    const errorBox = document.getElementById("regError");

    errorBox.innerHTML = "";

    if (!name || !mobile || !email || !password) {
        errorBox.innerHTML = "All fields are required.";
        return;
    }

    showLoader();

    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                mobile: mobile
            }
        }
    });

    hideLoader();

    if (error) {
        errorBox.innerHTML = error.message;
        return;
    }

    alert("User created successfully!");
}




// Login function
async function login() {
    showLoader();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const errorBox = document.getElementById("error");

    errorBox.innerHTML = "";

    if (!email || !password) {
        errorBox.innerHTML = "Both fields are required.";
        hideLoader();
        return;
    }

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorBox.innerHTML = error.message;
            hideLoader();
            return;
        }

        // Clear any previous redirect markers to avoid loop
        sessionStorage.removeItem('redirectedToDashboard');
        sessionStorage.removeItem('redirectedToIndex');

        // Redirect to dashboard page
        window.location.href = "dashboard.html";
    } catch (err) {
        console.error("Login error:", err);
        errorBox.innerHTML = "Unexpected error. Check console.";
        hideLoader();
    }
}

// Dashboard Script Starts Here
// If you have older commented getUser code, keep it commented — we guard auth from each page now.

async function loadProfile() {
    showLoader();

    const { data: { user }, error } = await client.auth.getUser();

    if (!user) {
        hideLoader();
        window.location.href = "index.html";
        return;
    }

    // Use metadata
    const name =
        user.user_metadata.full_name ||
        user.user_metadata.name ||
        user.email;

    console.log(name);


    const mobile = user.user_metadata.mobile || "";

    // Set in HTML
    const usernameEl = document.getElementById("username");
    if (usernameEl) usernameEl.textContent = name;


    hideLoader();
}



// Logout — show loader, sign out, clear redirect flags and go to index/login page
async function logout() {
    try {
        showLoader();
        const { error } = await client.auth.signOut();
        if (error) {
            console.error("Sign out error:", error);
            hideLoader();
            return;
        }
        // Clear redirect throttle markers — allow a clean fresh check on index
        sessionStorage.removeItem('redirectedToDashboard');
        sessionStorage.removeItem('redirectedToIndex');

        // give a tiny delay so user sees the loader briefly
        setTimeout(() => {
            window.location.href = "index.html";
        }, 220);

    } catch (err) {
        console.error("Logout exception:", err);
        hideLoader();
    }
}



// Path to static PDF in your project
const STATIC_PDF_PATH = './assets/pdfs/static-pages.pdf';

const previewContainer = document.getElementById('pdfPreviewContainer');
const previewFrame = document.getElementById('pdfPreview');
const downloadBtn = document.getElementById('downloadMergedPdf');
const previewBtn = document.getElementById('previewBtn');
const dynamicBtn = document.getElementById('dynamicBtn');

previewBtn.addEventListener('click', generateAndMergePdf);
// dynamicBtn.addEventListener('click', generateDynamicOnly);

async function generateDynamicOnly() {
    const bytes = await generateDynamicPageAsBytes();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

async function generateAndMergePdf() {
    const name = document.getElementById('name').value;
    try {
        const dynamicBytes = await generateDynamicPageAsBytes();
        const staticBytes = await fetch(STATIC_PDF_PATH)
            .then(res => res.ok ? res.arrayBuffer() : Promise.reject(res.statusText));

        const mergedBytes = await mergePDFs(dynamicBytes, staticBytes);
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        previewFrame.src = url;
        previewContainer.style.display = 'block';
        downloadBtn.onclick = () => downloadPDF(url, `Admission-Letter-${name}.pdf`);
    } catch (err) {
        console.error(err);
        alert('Error generating PDF. Check console for details.');
    }
}

function downloadPDF(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/**
 * Returns today's date formatted as "DD Month YYYY"
 * e.g. "04 September 2025"
 */
function getCurrentDateLongFormat() {
    const date = new Date();

    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
}

function generateDynamicPageAsBytes() {
    return new Promise(async (resolve) => {
        const bAmount = parseFloat(document.getElementById('bAmount').value) || 0;
        const scholarship = parseFloat(document.getElementById('scholarship').value) || 0;
        const programFee = 50000; // update or make dynamic if needed

        const finalFee = programFee - scholarship;
        const gstAmount = finalFee * 0.18;
        const netFee = finalFee + gstAmount;
        const duePayment = netFee - bAmount;

        const data = {
            newDate: getCurrentDateLongFormat(),
            name: document.getElementById('name').value,
            bAmount: bAmount,
            scholarship: scholarship,
            finalFee: finalFee,
            gstAmount: gstAmount,
            netFee: netFee,
            duePayment: duePayment
        };

        console.log(data);
        // resolve(data);


        // Build HTML snippet
        const container = document.createElement('div');
        container.innerHTML = `
      <div id="pdf-content" class="pdf-page">
    
        <img src="assets/images/logo.png" alt="Logo" class="pdf-logo">
        <h1 class="pdf-title">ADMISSION LETTER</h1>
        <div class="address">
            <div>
                iJaipuria<br>
                1/3, Block 1, Plot No. 3<br>
                WHS Timber Market, near Mayapuri Chowk,<br>
                Kirti Nagar, New Delhi, Delhi 110015
            </div>
            <div><strong>Date: ${data.newDate}</strong></div>
        </div>
        <p>Dear ${data.name},</p>

        <p>We are pleased to grant you a provisional offer to join our Skilling program Al-Powered Data Analytics.
            Your commitment to personal excellence makes you stand out as someone who will thrive within our
            learning environment.</p>

        <p>This program is scheduled to start in February 2026. Until then, you will be learning via self paced
            courses, pre-reads & live master classes. We look forward to communicating with you on all aspects
            related to your upcoming learning journey and giving you the opportunity to get to know us better. Over
            the next few weeks, we will be in touch via email and phone.</p>

        <p>Please be informed that you are required to pay a block amount of INR ${data.bAmount}/- for registration and
            enrollment processing purposes. Fee payment indicates your unequivocal acceptance of the T&C and related
            details listed in this letter.</p>

        <p>We know you are excited about the journey ahead, and so are we! Congratulations and welcome to the world
            of chasing BIG dreams and career decisions. We look forward to having you join us soon.</p>

        <div class="signature">
            <p>Best Regards,<br>Team iJaipuria</p>
        </div>

        <div class="appendix-title">APPENDIX A</div>

        <table>
            <thead>
                <tr>
                    <th>Details</th>
                    <th>Amount (INR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Program Fee</td>
                    <td>50,000</td>
                </tr>
                <tr>
                    <td>Scholarship</td>
                    <td>${data.scholarship}</td>
                </tr>
                <tr>
                    <td>Final Program Fee (Exclusive GST)</td>
                    <td>${data.finalFee}</td>
                </tr>
                <tr>
                    <td>GST @18%</td>
                    <td>${data.gstAmount}</td>
                </tr>
                <tr>
                    <td><strong>Net Program Fee*</strong></td>
                    <td><strong>${data.netFee}</strong></td>
                </tr>
            </tbody>
        </table>

        <table>
            <thead>
                <tr>
                    <th>Payment Milestones (Self Payment)</th>
                    <th>Terms</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Registration Amount At the time of Enrollment</td>
                    <td>${data.bAmount}</td>
                </tr>
                <tr>
                    <td>Within 2-7 days from the date of enrolment or before the batch start date (whichever comes
                        earlier)</td>
                    <td>${data.duePayment}</td>
                </tr>
            </tbody>
        </table>

        <p class="footer-note">Please note that if any of the installments are missed by the learner, then the class
            and/or content access will be revoked.</p>
    </div>`;

        // Wait for fonts to be loaded before PDF generation
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        html2pdf().set({
            margin: 15,
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4' }
        }).from(container).outputPdf('arraybuffer').then(resolve);
    });
}

async function mergePDFs(dynamicBytes, staticBytes) {
    const mergedPdf = await PDFLib.PDFDocument.create();
    const dyn = await PDFLib.PDFDocument.load(dynamicBytes);
    const stat = await PDFLib.PDFDocument.load(staticBytes);

    // Add dynamic first page
    const [dynPage] = await mergedPdf.copyPages(dyn, [0]);
    mergedPdf.addPage(dynPage);

    // Add all static pages
    const pageCount = stat.getPageCount();
    const indices = Array.from({ length: pageCount }, (_, i) => i);
    const statPages = await mergedPdf.copyPages(stat, indices);
    statPages.forEach(p => mergedPdf.addPage(p));

    return mergedPdf.save();
}

// Initialize Animate On Scroll
// AOS.init({
//     once: true, /* Animation happens only once */
//     offset: 100,
//     duration: 800,
//     easing: 'ease-out-cubic'
// });
