const repoForm = document.getElementById("repoForm");
const repoInput = document.getElementById("repoInput");

const loading = document.getElementById("loading");
const error = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");
const dashboard = document.getElementById("dashboard");

const repoName = document.getElementById("repoName");
const repoDescription = document.getElementById("repoDescription");
const repoLink = document.getElementById("repoLink");

const openCount = document.getElementById("openCount");
const closedCount = document.getElementById("closedCount");
const totalCount = document.getElementById("totalCount");

const issuesList = document.getElementById("issuesList");
const issueFilter = document.getElementById("issueFilter");

const pagination = document.getElementById("pagination");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageNumber = document.getElementById("pageNumber");

let currentOwner = "";
let currentRepo = "";
let currentPage = 1;
let currentFilter = "all";

repoForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const value = repoInput.value.trim();

    if (!value) {
        showError("Please enter a GitHub repository.");
        return;
    }

    const parts = value
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .split("/");

    if (parts.length < 2 || !parts[0] || !parts[1]) {
        showError("Use this format: owner/repository");
        return;
    }

    currentOwner = parts[0];
    currentRepo = parts[1].replace(".git", "");
    currentPage = 1;

    await loadRepository();
});

issueFilter.addEventListener("change", async () => {
    currentFilter = issueFilter.value;
    currentPage = 1;

    await loadIssues();
});

prevPage.addEventListener("click", async () => {
    if (currentPage > 1) {
        currentPage--;
        await loadIssues();
    }
});

nextPage.addEventListener("click", async () => {
    currentPage++;
    await loadIssues();
});

async function loadRepository() {
    showLoading();

    try {
        const response = await fetch(
            `https://api.github.com/repos/${currentOwner}/${currentRepo}`
        );

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Repository not found.");
            }

            throw new Error("Unable to load repository.");
        }

        const data = await response.json();

        repoName.textContent = data.full_name;

        repoDescription.textContent =
            data.description || "No description available.";

        repoLink.href = data.html_url;

        await loadIssueStats();
        await loadIssues();

        dashboard.classList.remove("hidden");
        error.classList.add("hidden");

    } catch (err) {
        showError(err.message);
    } finally {
        loading.classList.add("hidden");
    }
}

async function loadIssueStats() {
    const openResponse = await fetch(
        `https://api.github.com/repos/${currentOwner}/${currentRepo}/issues?state=open&per_page=1`
    );

    const closedResponse = await fetch(
        `https://api.github.com/repos/${currentOwner}/${currentRepo}/issues?state=closed&per_page=1`
    );

    const openData = await openResponse.json();
    const closedData = await closedResponse.json();

    const openTotal = getTotalCount(openResponse, openData);
    const closedTotal = getTotalCount(closedResponse, closedData);

    openCount.textContent = openTotal;
    closedCount.textContent = closedTotal;
    totalCount.textContent = openTotal + closedTotal;
}

function getTotalCount(response, data) {
    const link = response.headers.get("Link");

    if (!link) {
        return Array.isArray(data) ? data.length : 0;
    }

    const match = link.match(/page=(\d+)>; rel="last"/);

    if (match) {
        return Number(match[1]);
    }

    return Array.isArray(data) ? data.length : 0;
}

async function loadIssues() {
    issuesList.innerHTML = "<p>Loading issues...</p>";

    let url =
        `https://api.github.com/repos/${currentOwner}/${currentRepo}/issues` +
        `?state=${currentFilter === "all" ? "all" : currentFilter}` +
        `&per_page=10&page=${currentPage}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Unable to load issues.");
        }

        const issues = await response.json();

        issuesList.innerHTML = "";

        if (issues.length === 0) {
            issuesList.innerHTML =
                "<p>No issues found on this page.</p>";

            updatePagination(false);
            return;
        }

        issues.forEach((issue) => {
            createIssueCard(issue);
        });

        updatePagination(issues.length === 10);

    } catch (err) {
        issuesList.innerHTML =
            `<p class="error">${escapeHTML(err.message)}</p>`;
    }
}

function createIssueCard(issue) {
    const card = document.createElement("article");

    card.className = "issue-card";

    const labels = issue.labels
        .map(
            (label) =>
                `<span class="label">${escapeHTML(label.name)}</span>`
        )
        .join("");

    const state =
        issue.state === "open"
            ? "🟢 Open"
            : "🔴 Closed";

    card.innerHTML = `
        <h3>
            <a
                href="${issue.html_url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                #${issue.number} ${escapeHTML(issue.title)}
            </a>
        </h3>

        <div class="issue-info">
            <span>${state}</span>
            <span>👤 ${escapeHTML(issue.user.login)}</span>
            <span>💬 ${issue.comments}</span>
            <span>📅 ${formatDate(issue.created_at)}</span>
            ${labels}
        </div>
    `;

    issuesList.appendChild(card);
}

function updatePagination(hasNextPage) {
    pagination.classList.remove("hidden");

    pageNumber.textContent = `Page ${currentPage}`;

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = !hasNextPage;
}

function showLoading() {
    loading.classList.remove("hidden");
    error.classList.add("hidden");
    dashboard.classList.add("hidden");
}

function showError(message) {
    loading.classList.add("hidden");
    dashboard.classList.add("hidden");

    errorMessage.textContent = message;
    error.classList.remove("hidden");
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
