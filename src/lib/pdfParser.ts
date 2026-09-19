/**
 * Client and server compatible PDF text extractor
 */
export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer | Uint8Array): Promise<string> {
  try {
    let uint8Array: Uint8Array;

    if (fileOrBuffer instanceof Uint8Array) {
      uint8Array = fileOrBuffer;
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(fileOrBuffer);
    } else if (typeof fileOrBuffer === "object" && "arrayBuffer" in fileOrBuffer) {
      const buffer = await (fileOrBuffer as Blob).arrayBuffer();
      uint8Array = new Uint8Array(buffer);
    } else {
      throw new Error("Invalid file buffer format provided for PDF parsing.");
    }

    // Dynamic import to support both client-side and server-side environments
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs");

    // In browser, set worker if not set
    if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || "")
        .join(" ");
      fullText += (fullText ? "\n\n" : "") + pageText;
    }

    const cleanText = fullText.trim();
    if (cleanText.length > 30) {
      return cleanText;
    }
  } catch (err) {
    console.warn("PDF extraction via pdfjs-dist encountered an error, falling back to text stream:", err);
  }

  // Fallback if binary extraction fails (or if uploaded file was plain text)
  if (typeof window !== "undefined" && fileOrBuffer instanceof File) {
    try {
      return await fileOrBuffer.text();
    } catch (e) {
      console.error("Text fallback failed:", e);
    }
  }

  throw new Error("Unable to extract readable text from the provided PDF file. Please ensure it is a valid, non-scanned PDF or try our sample resume.");
}

/**
 * Built-in sample resumes for quick one-click testing
 */
export const SAMPLE_RESUMES = {
  fullstack: {
    role: "Senior Full-Stack Engineer",
    text: `ALEX MORGAN
Email: alex.morgan@example.com | Phone: +1 (555) 342-8901 | GitHub: github.com/alexmorgan | LinkedIn: linkedin.com/in/alexmorgan

SUMMARY
Innovative Senior Full-Stack Engineer with 6+ years of experience designing, architecting, and deploying high-scale distributed web applications. Expert in TypeScript, Next.js, React, Node.js, GraphQL, PostgreSQL, Redis, and AWS. Proven track record of reducing latency by 45% and leading cross-functional teams of 8 engineers.

TECHNICAL SKILLS
- Languages: TypeScript, JavaScript (ES6+), Python, Go, SQL, HTML5, CSS3
- Frameworks & Libraries: Next.js, React, Node.js, Express, Tailwind CSS, NestJS, Redux Toolkit, Prisma
- Databases & Storage: PostgreSQL, Redis, MongoDB, DynamoDB
- Cloud & DevOps: AWS (ECS, Lambda, S3, CloudFront, RDS), Docker, Kubernetes, Terraform, GitHub Actions, CI/CD
- Architecture & Practices: Microservices, RESTful APIs, GraphQL, Event-Driven Architecture, Unit Testing (Jest, Playwright), Agile/Scrum

PROFESSIONAL EXPERIENCE
Senior Full-Stack Software Engineer | CloudScale Tech, San Francisco, CA | 2022 - Present
- Architected and delivered a multi-tenant SaaS analytics platform handling 15M+ daily API requests using Next.js, Node.js, and PostgreSQL.
- Implemented real-time dashboard updates using WebSockets and Redis Pub/Sub, cutting notification latency from 3.2s to 120ms.
- Mentored 6 junior/mid-level engineers, established code review standards, and boosted test coverage from 55% to 88% using Jest and Playwright.
- Spearheaded migration of legacy monolith to containerized Docker microservices on AWS ECS, slashing server compute expenses by 32%.

Full-Stack Developer | Nexus Interactive, Austin, TX | 2019 - 2022
- Engineered high-traffic e-commerce storefronts using React, TypeScript, and Stripe payment gateways, driving $8M in annual checkout volume.
- Designed performant GraphQL schemas and optimized PostgreSQL query indexes, improving page-load speeds by 40%.
- Integrated automated CI/CD deployment pipelines with GitHub Actions and Docker, reducing deployment cycle times from 4 hours to 15 minutes.

PROJECTS
Distributed Task Queue & Job Scheduler (Go, Redis, Docker)
- Created an open-source distributed job queue system supporting delayed execution, exponential backoff retries, and high-concurrency worker pools capable of processing 10,000 tasks/sec.

AI-Powered Code Review Bot (Python, FastAPI, OpenAI API, GitHub Webhooks)
- Built an automated GitHub bot that performs automated static analysis and PR summary evaluations, adopted by 35+ developers across the engineering org.

EDUCATION
Bachelor of Science in Computer Science | University of Texas at Austin | 2015 - 2019
GPA: 3.8 / 4.0 | Dean's Honors List

CERTIFICATIONS & COURSES
- AWS Certified Solutions Architect - Associate (2023)
- Certified Kubernetes Application Developer (CKAD) (2024)
- Advanced Distributed Systems by MIT OpenCourseWare
`
  },
  ai_engineer: {
    role: "AI / Machine Learning Engineer",
    text: `PRIYA SHARMA
Email: priya.sharma@example.com | Phone: +1 (555) 782-9912 | Portfolio: priyasharma.dev | GitHub: github.com/priyasharma-ai

PROFESSIONAL SUMMARY
Machine Learning Engineer with 4+ years of expertise building LLM applications, RAG pipelines, computer vision models, and production inference APIs. Deep hands-on experience fine-tuning open-source models (Llama, Mistral), vector databases, Python, PyTorch, and deploying scalable MLOps workflows.

TECHNICAL SKILLS
- Core AI/ML: PyTorch, TensorFlow, Hugging Face Transformers, LangChain, LlamaIndex, Scikit-learn, OpenCV
- Vector Databases: Pinecone, Qdrant, Milvus, ChromaDB, pgvector
- Backend & Languages: Python, C++, TypeScript, FastAPI, Docker, Ray Serve, Triton Inference Server
- Cloud & Infrastructure: AWS (SageMaker, EKS, S3), GCP (Vertex AI), MLflow, Weights & Biases, Kubernetes
- Concepts: RAG Architecture, LoRA/PEFT Fine-Tuning, Quantization (GGUF/AWQ), Agentic Workflows, Embeddings

WORK EXPERIENCE
Machine Learning Engineer | Cognitive AI Labs, New York, NY | 2022 - Present
- Architected enterprise Retrieval-Augmented Generation (RAG) platform querying 10M+ documents with hybrid search (dense embeddings + BM25) and reranking models, achieving 94% retrieval accuracy.
- Fine-tuned 7B and 13B parameter LLMs using LoRA and QLoRA for domain-specific medical summaries, reducing hallucinations by 62%.
- Optimized LLM inference latency using vLLM and TensorRT-LLM, cutting P99 latency from 1.8s to 420ms while lowering token inference cost by 45%.

Data Scientist / ML Developer | DataNova Solutions, Boston, MA | 2020 - 2022
- Developed computer vision pipeline for automated defect detection on manufacturing assembly lines with 98.4% precision using YOLOv5 and PyTorch.
- Automated ML model training and tracking workflows using MLflow and DVC, enabling weekly continuous retraining cycles.

KEY PROJECTS
Autonomous Multi-Agent Researcher (Python, LangGraph, FastAPI, ChromaDB)
- Built an autonomous multi-agent reasoning framework that performs iterative web research, fact-checking, and report synthesis with citation grounding.

Real-Time Speech & Emotion Classifier (PyTorch, Whisper, Librosa)
- Developed an audio analysis model that extracts prosody, pitch, and sentiment markers from live microphone streams with <200ms latency.

EDUCATION
Master of Science in Artificial Intelligence | Carnegie Mellon University | 2018 - 2020
Bachelor of Technology in Computer Engineering | IIT Bombay | 2014 - 2018

CERTIFICATIONS & COURSES
- DeepLearning.AI Deep Learning Specialization (Andrew Ng)
- AWS Certified Machine Learning - Specialty (2023)
`
  }
};
