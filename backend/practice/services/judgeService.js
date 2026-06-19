// backend/practice/services/judgeService.js
// Custom code execution engine using Docker containers directly
// Works on Windows Docker Desktop (no cgroups v1 dependency)
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { v4: uuidv4 } = require("uuid");

// Language configurations
const LANG_CONFIG = {
  python: {
    image: "python:3.11-slim",
    fileName: "solution.py",
    compileCmd: null,
    runCmd: ["python3", "solution.py"],
  },
  javascript: {
    image: "node:18-slim",
    fileName: "solution.js",
    compileCmd: null,
    runCmd: ["node", "solution.js"],
  },
  c: {
    image: "gcc:12",
    fileName: "solution.c",
    compileCmd: ["gcc", "-o", "solution", "solution.c", "-lm"],
    runCmd: ["./solution"],
  },
  cpp: {
    image: "gcc:12",
    fileName: "solution.cpp",
    compileCmd: ["g++", "-o", "solution", "solution.cpp", "-std=c++17"],
    runCmd: ["./solution"],
  },
  java: {
    image: "eclipse-temurin:17-jdk",
    fileName: "Main.java",
    compileCmd: ["javac", "Main.java"],
    runCmd: ["java", "Main"],
  },
};

// Temp directory for code files
const TEMP_BASE = path.join(os.tmpdir(), "examecho-judge");

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_BASE)) {
    fs.mkdirSync(TEMP_BASE, { recursive: true });
  }
}

/**
 * Execute a docker command and return result
 * @returns {Promise<{stdout, stderr, exitCode, timedOut}>}
 */
function dockerRun(args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const proc = execFile("docker", args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024, // 1MB output buffer
    }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: error?.code || 0,
        timedOut: error?.killed || false,
        signal: error?.signal || null,
      });
    });
  });
}

/**
 * Execute code in an isolated Docker container
 * @param {string} language - "c"|"cpp"|"java"|"python"|"javascript"
 * @param {string} sourceCode - Full source code
 * @param {string} stdin - Standard input
 * @param {number} cpuTimeLimit - Time limit in seconds (default 5)
 * @param {number} memoryLimitMB - Memory limit in MB (default 256)
 */
async function executeCode(language, sourceCode, stdin = "", cpuTimeLimit = 5, memoryLimitMB = 256) {
  const config = LANG_CONFIG[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  ensureTempDir();

  // Create a unique temp directory for this submission
  const submissionId = uuidv4();
  const submissionDir = path.join(TEMP_BASE, submissionId);
  fs.mkdirSync(submissionDir, { recursive: true });

  try {
    // Write source code to temp file
    const codeFile = path.join(submissionDir, config.fileName);
    fs.writeFileSync(codeFile, sourceCode, "utf8");

    // Write stdin to file
    const stdinFile = path.join(submissionDir, "input.txt");
    fs.writeFileSync(stdinFile, stdin, "utf8");

    const containerName = `examecho-run-${submissionId.substring(0, 8)}`;
    const startTime = Date.now();

    // Build docker run command
    // --rm: auto-remove container when done
    // --network none: no network access (security)
    // --memory: memory limit
    // --cpus: CPU limit
    // -v: mount the submission directory as /code (read-only for source)
    const dockerArgs = [
      "run", "--rm",
      "--name", containerName,
      "--network", "none",
      `--memory=${memoryLimitMB}m`,
      "--cpus=1",
      "--pids-limit=64",
      "-v", `${submissionDir}:/code`,
      "-w", "/code",
      config.image,
    ];

    // If compilation is needed (C, C++, Java)
    if (config.compileCmd) {
      // First, compile
      const compileArgs = [...dockerArgs, ...config.compileCmd];
      const compileResult = await dockerRun(compileArgs, (cpuTimeLimit + 5) * 1000);

      if (compileResult.exitCode !== 0 || compileResult.stderr.includes("error")) {
        return {
          stdout: "",
          stderr: compileResult.stderr.trim(),
          compileOutput: compileResult.stderr.trim(),
          statusId: 6, // Compilation Error
          status: "Compilation Error",
          time: Date.now() - startTime,
          memory: 0,
        };
      }

      // Then, run the compiled binary
      const runArgs = [
        "run", "--rm",
        "--name", `${containerName}-run`,
        "--network", "none",
        `--memory=${memoryLimitMB}m`,
        "--cpus=1",
        "--pids-limit=64",
        "-v", `${submissionDir}:/code`,
        "-w", "/code",
        "-i",
        config.image,
        "sh", "-c", `cat /code/input.txt | ${config.runCmd.join(" ")}`,
      ];

      const runResult = await dockerRun(runArgs, (cpuTimeLimit + 3) * 1000);
      const execTime = Date.now() - startTime;

      if (runResult.timedOut) {
        return {
          stdout: "",
          stderr: "Time Limit Exceeded",
          compileOutput: "",
          statusId: 5,
          status: "Time Limit Exceeded",
          time: execTime,
          memory: 0,
        };
      }

      if (runResult.exitCode !== 0 && runResult.stderr) {
        return {
          stdout: runResult.stdout.trim(),
          stderr: runResult.stderr.trim(),
          compileOutput: "",
          statusId: 11, // Runtime Error
          status: "Runtime Error (NZEC)",
          time: execTime,
          memory: 0,
        };
      }

      return {
        stdout: runResult.stdout.trim(),
        stderr: runResult.stderr.trim(),
        compileOutput: "",
        statusId: 3, // Accepted (output check is done by caller)
        status: "Accepted",
        time: execTime,
        memory: 0,
      };
    }

    // Interpreted languages (Python, JavaScript) — just run
    const runArgs = [
      ...dockerArgs,
      "sh", "-c", `cat /code/input.txt | ${config.runCmd.join(" ")}`,
    ];

    const runResult = await dockerRun(runArgs, (cpuTimeLimit + 3) * 1000);
    const execTime = Date.now() - startTime;

    if (runResult.timedOut) {
      return {
        stdout: "",
        stderr: "Time Limit Exceeded",
        compileOutput: "",
        statusId: 5,
        status: "Time Limit Exceeded",
        time: execTime,
        memory: 0,
      };
    }

    if (runResult.exitCode !== 0 && runResult.stderr) {
      return {
        stdout: runResult.stdout.trim(),
        stderr: runResult.stderr.trim(),
        compileOutput: "",
        statusId: 11,
        status: "Runtime Error (NZEC)",
        time: execTime,
        memory: 0,
      };
    }

    return {
      stdout: runResult.stdout.trim(),
      stderr: runResult.stderr.trim(),
      compileOutput: "",
      statusId: 3,
      status: "Accepted",
      time: execTime,
      memory: 0,
    };
  } finally {
    // Clean up temp files
    try {
      fs.rmSync(submissionDir, { recursive: true, force: true });
    } catch {}
  }
}

// Status codes (compatible with our existing mapping)
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_SIGSEGV: 7,
  RUNTIME_SIGXFSZ: 8,
  RUNTIME_SIGFPE: 9,
  RUNTIME_SIGABRT: 10,
  RUNTIME_NZEC: 11,
  RUNTIME_OTHER: 12,
  INTERNAL_ERROR: 13,
};

/**
 * Run student code against multiple test cases
 */
async function runTestCases(language, studentCode, driverCode, testCases, includeHidden = false) {
  const casesToRun = includeHidden
    ? testCases
    : testCases.filter((tc) => !tc.isHidden);

  // Build full source
  let fullSource;
  if (language === "java" || language === "c" || language === "cpp") {
    // For compiled languages: driver code contains // __STUDENT_CODE__ placeholder
    fullSource = driverCode.replace("// __STUDENT_CODE__", studentCode);
  } else {
    // For Python/JavaScript: student code first, then driver code
    fullSource = studentCode + "\n\n" + driverCode;
  }

  const results = [];

  for (const tc of casesToRun) {
    const execResult = await executeCode(language, fullSource, tc.input);

    if (execResult.statusId === STATUS.COMPILATION_ERROR) {
      // All subsequent cases will fail with same compile error
      results.push({
        passed: false,
        input: tc.isHidden ? "(hidden)" : tc.input,
        expectedOutput: tc.isHidden ? "(hidden)" : tc.expectedOutput,
        actualOutput: "",
        executionTime: 0,
        memoryUsed: 0,
        errorOutput: execResult.compileOutput || execResult.stderr,
      });
      // Fill remaining as compile error
      const remaining = casesToRun.slice(results.length);
      for (const r of remaining) {
        results.push({
          passed: false,
          input: r.isHidden ? "(hidden)" : r.input,
          expectedOutput: r.isHidden ? "(hidden)" : r.expectedOutput,
          actualOutput: "",
          executionTime: 0,
          memoryUsed: 0,
          errorOutput: "Compilation Error (see above)",
        });
      }
      break;
    }

    const actualOutput = execResult.stdout.trim();
    const expectedOutput = tc.expectedOutput.trim();
    const passed = execResult.statusId === STATUS.ACCEPTED && actualOutput === expectedOutput;

    results.push({
      passed,
      input: tc.isHidden ? "(hidden)" : tc.input,
      expectedOutput: tc.isHidden ? "(hidden)" : tc.expectedOutput,
      actualOutput: tc.isHidden && !passed ? "(hidden)" : actualOutput,
      executionTime: execResult.time,
      memoryUsed: execResult.memory,
      errorOutput: execResult.stderr || "",
    });
  }

  // Determine overall status
  let overallStatus;
  const hasCompileError = results.some((r) => r.errorOutput?.includes("Compilation Error") || r.errorOutput?.includes("error:"));
  if (hasCompileError && results.every((r) => !r.passed)) {
    overallStatus = "compilation_error";
  } else if (results.every((r) => r.passed)) {
    overallStatus = "accepted";
  } else {
    const firstFail = results.find((r) => !r.passed);
    if (firstFail?.errorOutput?.includes("Time Limit")) {
      overallStatus = "time_limit_exceeded";
    } else if (firstFail?.errorOutput && firstFail.errorOutput !== "") {
      overallStatus = "runtime_error";
    } else {
      overallStatus = "wrong_answer";
    }
  }

  return {
    results,
    overallStatus,
    compileError: hasCompileError ? results[0]?.errorOutput : "",
  };
}

/**
 * Health check — verify Docker is available
 */
async function checkHealth() {
  try {
    const result = await dockerRun(["version", "--format", "{{.Server.Version}}"], 5000);
    return { healthy: result.exitCode === 0, version: result.stdout.trim() };
  } catch {
    return { healthy: false, version: null };
  }
}

/**
 * Pre-pull required Docker images (call once at startup)
 */
async function pullImages() {
  const images = [...new Set(Object.values(LANG_CONFIG).map((c) => c.image))];
  console.log("Pre-pulling Docker images for code execution...");
  for (const image of images) {
    console.log(`  Pulling ${image}...`);
    await dockerRun(["pull", image], 120000); // 2 min timeout per image
  }
  console.log("All images pulled.");
}

module.exports = {
  executeCode,
  runTestCases,
  checkHealth,
  pullImages,
  STATUS,
};
