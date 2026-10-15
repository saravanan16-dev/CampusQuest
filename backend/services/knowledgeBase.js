/**
 * knowledgeBase.js
 * Comprehensive, university-level engineering curriculum knowledge engine.
 * Provides deep, structured academic explanations when external cloud APIs
 * are throttled or rate-limited.
 */

const topics = [
    {
        keywords: ["machine learning", "ml", "supervised", "unsupervised", "reinforcement learning", "deep learning", "neural network"],
        title: "Machine Learning (ML)",
        subject: "Artificial Intelligence & Machine Learning",
        directAnswer: `**Machine Learning (ML)** is a subfield of Artificial Intelligence that focuses on developing algorithms and statistical models enabling computer systems to automatically learn patterns from data and improve their performance on a specific task without being explicitly programmed.

Formally, as defined by Tom Mitchell:
> *"A computer program is said to learn from experience $E$ with respect to some class of tasks $T$ and performance measure $P$, if its performance at tasks in $T$, as measured by $P$, improves with experience $E$."*`,
        taxonomy: `### 1️⃣ Core Taxonomies of Machine Learning

| Paradigm | Training Input | Objective | Classic Algorithms | Example Applications |
|---|---|---|---|---|
| **Supervised Learning** | Labeled data $(X, y)$ | Learn mapping function $f: X \to y$ to predict outputs for unseen data | Linear/Logistic Regression, Decision Trees, SVM, Random Forest | Spam detection, Medical diagnosis, House price prediction |
| **Unsupervised Learning** | Unlabeled data $X$ | Discover latent patterns, clusters, or probability distributions | K-Means, Hierarchical Clustering, PCA, Apriori | Customer segmentation, Anomaly detection, Dimensionality reduction |
| **Reinforcement Learning** | Environment states, rewards $R$, actions $A$ | Learn policy $\pi(s)$ maximizing cumulative reward through trial-and-error | Q-Learning, Deep Q-Networks (DQN), PPO, Policy Gradients | Autonomous driving, Chess/Go game playing, Robotics control |
| **Semi-Supervised Learning** | Small labeled set + Large unlabeled set | Leverage abundance of unlabeled data with minimal labeling cost | Self-training, Generative Adversarial Networks (GANs) | Speech recognition, Protein sequence classification |`,
        workflow: `### 2️⃣ Standard Machine Learning Pipeline

\`\`\`
[1. Problem Formulation]
         ↓
[2. Data Collection & Cleaning] (Handling missing values, outlier removal)
         ↓
[3. Feature Engineering & Scaling] (Normalization, Standardization, One-Hot Encoding)
         ↓
[4. Model Selection & Architecture Design]
         ↓
[5. Training & Loss Minimization] (Cost function $J(\\theta)$, Gradient Descent optimization)
         ↓
[6. Evaluation & Validation] (Confusion Matrix, Precision/Recall, F1-Score, ROC-AUC)
         ↓
[7. Hyperparameter Tuning] (Grid Search, Random Search, Cross-Validation)
         ↓
[8. Deployment & Inference Monitoring]
\`\`\``,
        coreConcepts: `### 3️⃣ Fundamental Principles & Trade-offs

1. **Bias-Variance Trade-off**:
   - **High Bias (Underfitting)**: Model is overly simplistic and misses underlying patterns (e.g., fitting a straight line to quadratic data). High training and test error.
   - **High Variance (Overfitting)**: Model memorizes training noise rather than generalizing. Low training error, high validation error.
   - **Optimal Model**: Minimizes the total expected generalization error:
     $$\\text{Total Error} = \\text{Bias}^2 + \\text{Variance} + \\text{Irreducible Error} (\\sigma^2)$$

2. **Regularization Techniques**:
   - **L1 Regularization (Lasso)**: Adds penalty $\\lambda \\sum |w_i|$ to loss; induces sparsity (feature selection).
   - **L2 Regularization (Ridge)**: Adds penalty $\\lambda \\sum w_i^2$ to loss; shrinks weights, prevents runaway gradients.
   - **Dropout**: Randomly deactivates neurons during training in deep networks to prevent co-adaptation.`,
        examTip: `### 🎯 University Examination Strategy (10-16 Marks)
- **Essential Diagrams**: Always sketch the **Bias-Variance curve** (showing underfitting, sweet spot, and overfitting regions) and the **Supervised vs. Unsupervised taxonomy tree**.
- **Key Distinctions**: Be prepared to write a 5-point comparison table between **Parametric vs. Non-Parametric models** and **Classification vs. Regression**.`
    },
    {
        keywords: ["quicksort", "quick sort", "partition", "divide and conquer", "sorting"],
        title: "QuickSort Algorithm",
        subject: "Design and Analysis of Algorithms",
        directAnswer: `**QuickSort** is an efficient, comparison-based, in-place sorting algorithm developed by Tony Hoare in 1959. It operates on the **Divide-and-Conquer** algorithmic paradigm by selecting an element as a *pivot* and partitioning the array around the pivot so that elements smaller than the pivot precede it, and larger elements follow it.`,
        taxonomy: `### 1️⃣ Complexity Analysis & Recurrence Relations

| Case | Time Complexity | Recurrence Relation | Condition Leading to Case |
|---|---|---|---|
| **Best Case** | $\\mathcal{O}(n \\log n)$ | $T(n) = 2T(n/2) + \\Theta(n)$ | Pivot always splits array into two equal halves |
| **Average Case** | $\\mathcal{O}(n \\log n)$ | $T(n) = \\frac{1}{n} \\sum [T(k) + T(n-k-1)] + \\Theta(n)$ | Random or median pivot distributions |
| **Worst Case** | $\\mathcal{O}(n^2)$ | $T(n) = T(n-1) + \\Theta(n)$ | Array is already sorted or reverse sorted and first/last element is picked as pivot |

- **Auxiliary Space Complexity**: $\\mathcal{O}(\\log n)$ recursion stack in best/average case; $\\mathcal{O}(n)$ in worst case.
- **Stability**: Not stable by default (relative order of identical elements is not preserved).
- **In-Place**: Yes, sorting is performed within the original array without allocating duplicate arrays.`,
        workflow: `### 2️⃣ Algorithm & Lomuto Partition Pseudocode

\`\`\`c
// Lomuto Partition Scheme
int partition(int arr[], int low, int high) {
    int pivot = arr[high]; // Choosing last element as pivot
    int i = (low - 1);     // Index of smaller element

    for (int j = low; j <= high - 1; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(&arr[i], &arr[j]);
        }
    }
    swap(&arr[i + 1], &arr[high]);
    return (i + 1);
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);  // Sort left sub-array
        quickSort(arr, pi + 1, high); // Sort right sub-array
    }
}
\`\`\``,
        coreConcepts: `### 3️⃣ Optimization Strategies to Prevent Worst-Case
1. **Randomized QuickSort**: Select pivot uniformly at random to guarantee $\\mathcal{O}(n \\log n)$ expected runtime regardless of initial input permutation.
2. **Median-of-Three Partitioning**: Inspect first, middle, and last elements, and choose the median as the pivot.
3. **Tail Recursion Elimination**: Recursively call the smaller sub-problem first to guarantee stack depth is strictly bounded by $\\mathcal{O}(\\log n)$.`,
        examTip: `### 🎯 University Examination Strategy
- **Master Theorem Trap**: Note that QuickSort recurrence $T(n) = T(n-1) + n$ in worst case cannot be solved by the standard Master Theorem (use recursion tree or substitution method).
- Show step-by-step trace of a 6-element array during Lomuto/Hoare partition to earn full method marks.`
    },
    {
        keywords: ["dijkstra", "shortest path", "greedy", "graph"],
        title: "Dijkstra's Single-Source Shortest Path Algorithm",
        subject: "Design and Analysis of Algorithms / Computer Networks",
        directAnswer: `**Dijkstra's Algorithm** is a greedy graph-traversal algorithm designed by Edsger W. Dijkstra in 1956 to solve the **Single-Source Shortest Path (SSSP)** problem on weighted directed or undirected graphs with **strictly non-negative edge weights** ($w(u, v) \\ge 0$).`,
        taxonomy: `### 1️⃣ Data Structure Implementations & Complexities

| Priority Queue Implementation | Min-Extract Time | Edge Relaxation Time | Total Time Complexity |
|---|---|---|---|
| **Linear Array** | $\\mathcal{O}(V)$ | $\\mathcal{O}(1)$ | $\\mathcal{O}(V^2)$ (Optimal for dense graphs $E \\approx V^2$) |
| **Binary Min-Heap** | $\\mathcal{O}(\\log V)$ | $\\mathcal{O}(\\log V)$ | $\\mathcal{O}((V + E) \\log V)$ (Optimal for sparse graphs) |
| **Fibonacci Heap** | $\\mathcal{O}(\\log V)$ amortized | $\\mathcal{O}(1)$ amortized | $\\mathcal{O}(E + V \\log V)$ (Theoretically fastest) |`,
        workflow: `### 2️⃣ Relaxation Invariant & Algorithm

For every edge $(u, v)$ with weight $w(u, v)$:
$$\\text{If } \\text{dist}[u] + w(u, v) < \\text{dist}[v] \\implies \\text{dist}[v] = \\text{dist}[u] + w(u, v), \\quad \\text{parent}[v] = u$$

\`\`\`c
void dijkstra(Graph G, int source) {
    for each vertex v in G.V:
        dist[v] = INFINITY;
        visited[v] = false;
        parent[v] = NULL;
    dist[source] = 0;

    MinPriorityQueue Q = all vertices keyed by dist;

    while (!Q.isEmpty()) {
        u = Q.extractMin();
        visited[u] = true;

        for each neighbor v of u:
            if (!visited[v] && dist[u] + weight(u, v) < dist[v]) {
                dist[v] = dist[u] + weight(u, v);
                parent[v] = u;
                Q.decreaseKey(v, dist[v]);
            }
    }
}
\`\`\``,
        coreConcepts: `### 3️⃣ Why Dijkstra Fails with Negative Edge Weights
Dijkstra relies on the **Greedy Choice Property**: once a vertex is extracted from the priority queue and marked finalized/visited, its shortest distance is permanently fixed under the assumption that adding any further edges cannot decrease total cost. If negative weight edges exist, an alternative path through a negative edge could subsequently yield a smaller total distance, invalidating prior decisions. Use **Bellman-Ford Algorithm** $(\\mathcal{O}(V \\cdot E))$ when negative edge weights are present.`,
        examTip: `### 🎯 University Examination Strategy
- Draw a neat iteration table with columns: \`Step | Current Min Vertex | dist[A] | dist[B] | dist[C] | ...\`.
- Network layer relation: OSPF (Open Shortest Path First) routing protocol in computer networks is a direct implementation of Dijkstra's algorithm.`
    },
    {
        keywords: ["normalization", "1nf", "2nf", "3nf", "bcnf", "normal forms", "functional dependency"],
        title: "Database Normalization & Normal Forms",
        subject: "Database Management Systems (DBMS)",
        directAnswer: `**Database Normalization** is a systematic multi-step process of designing a relational database schema by decomposing tables to eliminate data redundancy and prevent undesirable anomalies (Insertion, Deletion, and Update anomalies) while preserving data integrity and functional dependencies.`,
        taxonomy: `### 1️⃣ Normal Forms Hierarchy & Criteria

| Normal Form | Foundational Requirement | Condition to Satisfy | Prevents Anomaly |
|---|---|---|---|
| **1NF (First Normal Form)** | Atomic Attributes | All attribute values must be atomic (indivisible scalar values); no repeating groups or nested multi-valued fields. | Structural nesting |
| **2NF (Second Normal Form)** | Must be in 1NF | No **Partial Functional Dependency**: Every non-prime attribute must be fully functionally dependent on the entire Candidate Key (not a proper subset). | Redundancy in composite keys |
| **3NF (Third Normal Form)** | Must be in 2NF | No **Transitive Dependency**: For every non-trivial functional dependency $X \\to A$, either $X$ is a Super Key OR $A$ is a Prime Attribute. | Transitive update anomalies |
| **BCNF (Boyce-Codd NF)** | Strict 3NF | For every non-trivial functional dependency $X \\to A$, $X$ must be a **Super Key** (determinant must be a candidate/super key). | Overlapping candidate key anomalies |`,
        workflow: `### 2️⃣ Step-by-Step Normalization Example

Consider unnormalized student course data:
\`StudentCourse(StudentID, CourseID, StudentName, CourseName, InstructorName, InstructorRoom)\`
- Candidate Key: \`(StudentID, CourseID)\`

1. **Step to 2NF**:
   - \`StudentID -> StudentName\` (Partial Dependency on part of candidate key)
   - \`CourseID -> CourseName, InstructorName, InstructorRoom\` (Partial Dependency)
   - **Decomposition**:
     - $R_1$: \`Student(StudentID, StudentName)\`
     - $R_2$: \`Course(CourseID, CourseName, InstructorName, InstructorRoom)\`
     - $R_3$: \`Enrollment(StudentID, CourseID)\`

2. **Step to 3NF**:
   - In table $R_2$, \`InstructorName -> InstructorRoom\`. Since \`InstructorName\` is not a super key and \`InstructorRoom\` is not prime, this is a **Transitive Dependency**.
   - **Decomposition**:
     - $R_{2A}$: \`Course(CourseID, CourseName, InstructorName)\`
     - $R_{2B}$: \`Instructor(InstructorName, InstructorRoom)\``,
        coreConcepts: `### 3️⃣ Key Properties of Decomposition
1. **Lossless-Join Property**: A decomposition of $R$ into $R_1, R_2$ is lossless with respect to $F$ if and only if:
   $$(R_1 \\cap R_2) \\to R_1 \\quad \\text{or} \\quad (R_1 \\cap R_2) \\to R_2$$
2. **Dependency Preservation**: All functional dependencies in original schema $F$ can be enforced by individual decomposed relations without requiring expensive distributed joins.`,
        examTip: `### 🎯 University Examination Strategy
- State Armstrong's Axioms (Reflexivity, Augmentation, Transitivity).
- Explain why BCNF is strictly stronger than 3NF, but 3NF always guarantees dependency preservation whereas BCNF may sacrifice dependency preservation.`
    },
    {
        keywords: ["deadlock", "banker", "coffman", "resource allocation"],
        title: "Operating System Deadlocks & Banker's Algorithm",
        subject: "Operating Systems (OS)",
        directAnswer: `A **Deadlock** in an Operating System is a pathological concurrency state where a set of processes are permanently blocked because each process holds a resource and waits to acquire another resource currently held by some other process in the cyclic set.`,
        taxonomy: `### 1️⃣ Coffman's Four Necessary Conditions for Deadlock

Deadlock can arise if and only if all four conditions hold simultaneously:
1. **Mutual Exclusion**: At least one resource must be held in a non-shareable mode (only one process can use it at a time).
2. **Hold and Wait**: A process must currently hold at least one resource while waiting to acquire additional resources held by others.
3. **No Preemption**: Resources cannot be forcibly preempted from a process; they can only be released voluntarily upon task completion.
4. **Circular Wait**: A closed chain of processes $\{P_0, P_1, \\dots, P_n\}$ exists such that $P_0$ waits for $P_1$, $P_1$ waits for $P_2$, and $P_n$ waits for $P_0$.`,
        workflow: `### 2️⃣ Banker's Algorithm (Deadlock Avoidance)

Formulated by Edsger Dijkstra, the **Banker's Algorithm** tests for safety by simulating the allocation of predetermined maximum possible amounts of all resources, and then runs a state-check to see if a **Safe Execution Sequence** exists.

- **Data Structures**:
  - \`Available[m]\`: Vector of length $m$ (available instances of resource $R_j$).
  - \`Max[n][m]\`: Maximum demand of process $P_i$ for resource $R_j$.
  - \`Allocation[n][m]\`: Instances of resource $R_j$ currently allocated to process $P_i$.
  - \`Need[n][m] = Max[n][m] - Allocation[n][m]\`: Remaining resource need of process $P_i$.

- **Safety Algorithm**:
  1. Let \`Work = Available\` and \`Finish[i] = false\` for all $i$.
  2. Find an index $i$ such that \`Finish[i] == false\` and \`Need[i] <= Work\`.
     - If no such $i$ exists, proceed to Step 4.
  3. \`Work = Work + Allocation[i]\`, \`Finish[i] = true\`, append $P_i$ to Safe Sequence. Return to Step 2.
  4. If \`Finish[i] == true\` for all $i$, system is in a **Safe State**; otherwise, it is **Unsafe** (deadlock risk).`,
        coreConcepts: `### 3️⃣ Deadlock Strategies Comparison

| Strategy | Principle | Overhead / Cost | Real-World Adoption |
|---|---|---|---|
| **Prevention** | Design protocol to invalidate at least one Coffman condition | Low device utilization, potential starvation | Embedded systems |
| **Avoidance** | Dynamically inspect resource requests using Banker's / RAG | $\\mathcal{O}(m \\cdot n^2)$ verification overhead | Rare in general OS |
| **Detection & Recovery** | Allow deadlock, run periodic Wait-For-Graph checks, terminate processes | Process termination & rollback loss | High-performance databases |
| **Ostrich Algorithm** | Ignore the problem assuming deadlocks are rare | Zero runtime overhead | Linux, Windows, macOS |`,
        examTip: `### 🎯 University Examination Strategy
- Practice the standard Banker's numerical problem (given Allocation, Max, Available matrices, calculate Need matrix and determine if $\\langle P_1, P_3, P_4, P_0, P_2 \\rangle$ is a safe sequence).`
    },
    {
        keywords: ["tcp", "udp", "osi", "transport layer", "three way handshake", "congestion control"],
        title: "TCP vs UDP & Transport Layer Protocols",
        subject: "Computer Networks",
        directAnswer: `The **Transport Layer** provides logical communication between application processes running on different hosts. The two foundational protocols of the Internet Protocol Suite are **TCP (Transmission Control Protocol - RFC 793)** and **UDP (User Datagram Protocol - RFC 768)**, representing contrasting design philosophies between reliability and transmission speed.`,
        taxonomy: `### 1️⃣ TCP vs UDP Comparative Analysis

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
|---|---|---|
| **Connection Paradigm** | Connection-oriented (requires 3-Way Handshake) | Connectionless (No handshake; send-and-forget) |
| **Reliability** | Guaranteed delivery (ACKs, Retransmission via Go-Back-N / Selective Repeat) | Best-effort delivery (Packets may be dropped, duplicated, or reordered) |
| **Header Size** | 20 to 60 bytes (Variable due to Options) | 8 bytes fixed (Source Port, Dest Port, Length, Checksum) |
| **Flow Control** | Yes (Sliding Window Protocol with window size $rwnd$) | No flow control |
| **Congestion Control** | Yes (AIMD, Slow Start, Congestion Avoidance, Fast Retransmit/Recovery) | No congestion control |
| **Data Stream** | Byte stream (continuous byte sequence) | Message-oriented (Datagram boundaries preserved) |
| **Standard Use-cases** | HTTP/HTTPS, FTP, SSH, SMTP | DNS, VoIP, Video Streaming, Online Gaming, DHCP |`,
        workflow: `### 2️⃣ TCP 3-Way Handshake & Connection Teardown

\`\`\`
   CLIENT (Host A)                               SERVER (Host B)
      |                                                |
      | -------- 1. SYN (seq = x) --------------------> | [LISTEN -> SYN_RCVD]
      |                                                |
      | <------- 2. SYN-ACK (seq = y, ack = x + 1) ---- |
      |                                                |
      | -------- 3. ACK (seq = x + 1, ack = y + 1) ----> | [ESTABLISHED]
      |                                                |
[Connection Established: Bidirectional Data Flow Begins]
\`\`\``,
        coreConcepts: `### 3️⃣ TCP Congestion Control Mechanisms
1. **Slow Start**: Congestion Window $cwnd$ starts at 1 MSS and doubles every RTT (exponential growth: $1 \\to 2 \\to 4 \\to 8 \\dots$) until reaching Slow-Start Threshold ($ssthresh$).
2. **Congestion Avoidance**: Once $cwnd \\ge ssthresh$, growth switches to Additive Increase (increases by 1 MSS per RTT).
3. **Loss Recovery**:
   - **Triple Duplicate ACKs**: Fast Retransmit occurs immediately without waiting for Retransmission Timeout (RTO); sets $ssthresh = cwnd/2$ and begins Fast Recovery.
   - **Timeout (RTO)**: Drastic penalty; resets $cwnd = 1$ MSS and restarts Slow Start.`,
        examTip: `### 🎯 University Examination Strategy
- Draw the 20-byte TCP Header format neatly (Source Port, Destination Port, Sequence Number, Ack Number, Flags: URG, ACK, PSH, RST, SYN, FIN, Window Size, Checksum, Urgent Pointer).`
    }
];

/**
 * Searches the local engineering curriculum knowledge base for high-precision
 * academic answers when external cloud APIs are unavailable.
 */
const findKnowledge = (query, subject = "") => {
    const qLower = query.toLowerCase();
    const subLower = subject.toLowerCase();

    // Score topics based on keyword matches
    let bestTopic = null;
    let highestScore = 0;

    for (const item of topics) {
        let score = 0;
        for (const kw of item.keywords) {
            if (qLower.includes(kw)) score += 3;
        }
        if (subLower && item.subject.toLowerCase().includes(subLower)) {
            score += 2;
        }
        if (score > highestScore) {
            highestScore = score;
            bestTopic = item;
        }
    }

    if (!bestTopic || highestScore < 3) {
        return null;
    }

    // Format into rich university answer
    const markdown = `${bestTopic.directAnswer}

---

${bestTopic.taxonomy}

---

${bestTopic.workflow}

---

${bestTopic.coreConcepts}

---

${bestTopic.examTip}`;

    return {
        title: bestTopic.title,
        subject: bestTopic.subject,
        content: markdown
    };
};

module.exports = {
    findKnowledge,
    topics
};
