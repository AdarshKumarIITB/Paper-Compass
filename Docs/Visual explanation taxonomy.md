
# Visual Explanation Taxonomy for AI-Generated Paper Diagrams

## 1. Content Type Taxonomy

The taxonomy below draws on three sources: the information visualization type system from Shneiderman (1996), which classifies data by structure (1D linear, 2D spatial, 3D, temporal, tree, network, multidimensional); the science communication categories used in Distill.pub's editorial guidelines and Lee et al.'s survey of figure types in scientific papers (2017); and the structural patterns that recur in CS papers across subfields.

Each content type is defined by what it asks the reader to understand, not by where it appears in a paper. A "Related Work" section that describes an architecture is an architecture description, not a literature review. Section headings correlate with content types but do not determine them.

### 1.1 Architecture Description

**Definition:** A specification of components, their arrangement and the connections between them. The reader needs to understand spatial/structural relationships: what connects to what, what is inside what, where data enters and exits.

**Examples:** The transformer encoder-decoder diagram in Vaswani et al. (2017). The U-Net skip connection structure in Ronneberger et al. (2015). The mixture-of-experts routing in Shazeer et al. (2017).

**Understanding required:** Containment (which components are sub-components of others), connectivity (data flow between components), multiplicity (repeated structures like stacked layers) and optional conditionality (gating, routing).

### 1.2 Algorithm / Process Walkthrough

**Definition:** A sequential or branching procedure described step by step. The reader needs to follow temporal ordering: what happens first, what depends on what, where branches or loops occur.

**Examples:** The RLHF training pipeline in Ouyang et al. (2022): supervised fine-tuning, then reward model training, then PPO optimization. Beam search decoding. The expectation-maximization algorithm.

**Understanding required:** Temporal sequence, branching conditions, loop structures, input/output at each step.

### 1.3 Training / Optimization Procedure

**Definition:** A specific subtype of process walkthrough focused on how model parameters are updated. Distinct from generic algorithms because training procedures involve loss computation, gradient flow, multi-stage schedules and often multiple interacting models.

**Examples:** GAN training alternation between generator and discriminator (Goodfellow et al., 2014). Curriculum learning schedules. The three-phase RLHF pipeline. Contrastive learning with positive/negative pair construction.

**Understanding required:** What quantities are computed, what is held fixed vs. updated, the direction of gradient flow, the relationship between loss functions and model behavior.

### 1.4 Data Pipeline / Preprocessing

**Definition:** The transformation chain that converts raw data into model-ready inputs. The reader needs to track data shape and content through a series of transformations.

**Examples:** Tokenization + BPE encoding + positional embedding in language models. Image augmentation pipelines. Dataset construction procedures in benchmark papers.

**Understanding required:** Data format at each stage, what each transformation adds or removes, where information is lost or created.

### 1.5 Quantitative Results (Comparisons)

**Definition:** Numerical outcomes arranged for comparison across methods, configurations or conditions. The reader needs to assess relative magnitudes and identify patterns.

**Examples:** Ablation tables showing performance with/without each component. Benchmark leaderboard comparisons. Scaling law curves (Kaplan et al., 2020). Training loss curves.

**Understanding required:** Relative magnitudes, trends across conditions, which differences are meaningful, interaction effects in ablations.

### 1.6 Quantitative Results (Distributions / Relationships)

**Definition:** Numerical data revealing distributions, correlations or functional relationships rather than simple comparisons. The reader needs to understand data shape, density, outliers or parametric relationships.

**Examples:** t-SNE / UMAP embedding visualizations. Attention weight heatmaps. Loss landscapes. Calibration curves. Feature importance distributions.

**Understanding required:** Density patterns, cluster structure, correlation direction and strength, distribution shape.

### 1.7 Qualitative Results / Case Studies

**Definition:** Concrete examples demonstrating system behavior on specific inputs. The reader needs to evaluate output quality, compare input/output pairs, or trace how the system handled a particular case.

**Examples:** Generated image samples from a diffusion model. Translation examples showing failure modes. Attention visualization on a specific input sentence. Adversarial example demonstrations.

**Understanding required:** Input-output correspondence, quality assessment against implicit criteria, identification of patterns across examples.

### 1.8 Theoretical Claim / Proof Structure

**Definition:** A logical argument establishing that a property holds under specified conditions. The reader needs to follow the dependency chain: which assumptions lead to which intermediate results, how those combine to produce the conclusion.

**Examples:** PAC learning bounds. Convergence proofs for optimization algorithms. Hardness reductions. The universal approximation theorem.

**Understanding required:** Logical dependencies (which lemmas feed which theorems), assumption scope (what must hold for the result to apply), proof strategy (induction, contradiction, construction).

### 1.9 Problem Formulation / Mathematical Setup

**Definition:** The formal specification of what the paper is trying to solve, stated in mathematical terms. The reader needs to understand the variables, constraints, objective and how they relate to the real-world problem.

**Examples:** The reinforcement learning MDP formulation. The optimization objective in variational autoencoders. Loss function definitions. The formal statement of a fairness constraint.

**Understanding required:** Variable roles (what is given, what is optimized, what is constrained), the relationship between formal notation and intuitive meaning, the space of possible solutions.

### 1.10 Conceptual Framework / Taxonomy

**Definition:** An organizational scheme that categorizes related ideas, methods or phenomena. The reader needs to understand the classification criteria and the relationships between categories.

**Examples:** The taxonomy of attention mechanisms in Lin et al. (2022). Categorizations of adversarial attacks by threat model. The spectrum from model-based to model-free RL.

**Understanding required:** Classification axes, hierarchical containment (which categories are subtypes of others), boundary cases, coverage (what the taxonomy includes and excludes).

### 1.11 System / Deployment Architecture

**Definition:** The engineering structure of a system as deployed, including infrastructure components, communication patterns and operational concerns. Distinct from model architecture in that it describes how the system runs rather than how the model computes.

**Examples:** The serving architecture for large language models with KV cache management. Federated learning communication topology. MapReduce job structure. Microservice decomposition for ML pipelines.

**Understanding required:** Component roles, communication protocols and patterns, failure modes, scaling behavior.

---

## 2. Content Type to Visual Format Mapping

For each content type, the table below specifies what the visual should show and how it changes across the three depth levels defined in the design spec (Conceptual, Technical, Formal). Generation constraints assume the MVP limit of 25 nodes per diagram.

### 2.1 Architecture Description

**What the reader needs to see:** Component boundaries, data flow direction, skip connections or recurrence, and the hierarchical grouping of sub-components.

**Conceptual:** Simplified block diagram. Each major component is a labeled box. Arrows show primary data flow. Internal structure of components is hidden. Labels use descriptive names ("Attention Layer," "Feed-Forward Block") without variable names. Color coding distinguishes component types (input processing, core computation, output). Max 10-12 nodes.

**Technical:** Block diagram with internal structure exposed for key components. Tensor dimension annotations on arrows (e.g., [batch, seq_len, d_model]). Activation functions and normalization steps shown as small inline nodes. Parameter counts annotated per component. Skip connections and residual paths drawn explicitly. 15-20 nodes.

**Formal:** Computational graph with full tensor operations. Each node is a mathematical operation (matmul, softmax, layer_norm). Edges labeled with tensor dimensions and dtypes. Gradient flow direction indicated with a second set of arrows or dashed lines. Multi-head structures shown with explicit parallel paths and concatenation. 20-25 nodes.

**Generation format:** Mermaid flowchart (Conceptual/Technical), SVG (Formal, due to dual-arrow and annotation density).

### 2.2 Algorithm / Process Walkthrough

**What the reader needs to see:** Step ordering, decision points, loop boundaries, inputs consumed and outputs produced at each step.

**Conceptual:** Vertical flowchart with numbered steps. Each step is a short natural-language description ("Score each word pair for relevance"). Decision points shown as diamonds with labeled branches. Loops indicated with back-arrows and a plain-language loop condition. 8-12 nodes.

**Technical:** Flowchart with pseudocode-level step descriptions. Variable names introduced. Data structures named at each step (e.g., "priority queue Q"). Complexity annotations per step (O(n log n)). Loop invariants stated. 12-18 nodes.

**Formal:** Pseudocode block alongside a state diagram showing how key variables change at each step. Or: a derivation chain showing how each step's output is computed from its inputs via equations. 15-25 nodes.

**Generation format:** Mermaid flowchart (Conceptual/Technical), SVG with code blocks (Formal).

### 2.3 Training / Optimization Procedure

**What the reader needs to see:** Which models are updated when, what loss signals drive each update, the direction of gradient flow, and the schedule of phases or alternation.

**Conceptual:** A stage diagram showing training phases in sequence. Within each phase, a simple loop diagram: input goes in, prediction comes out, loss is computed, model updates. Components held frozen are visually dimmed. 8-12 nodes.

**Technical:** Expanded stage diagram with loss function names, optimizer specifications (Adam, lr=3e-4), and explicit gradient flow arrows. Multiple interacting models (e.g., generator/discriminator, policy/reward model) shown with their respective update arrows. Frozen components marked. Batch size and epoch counts annotated. 15-20 nodes.

**Formal:** Computational graph of the full forward and backward pass for one training step. Loss function decomposition shown (e.g., L_total = L_reconstruction + beta * L_KL). Gradient computation chain with partial derivatives labeled. 20-25 nodes.

**Generation format:** Mermaid flowchart with subgraphs (Conceptual/Technical), SVG (Formal).

### 2.4 Data Pipeline / Preprocessing

**What the reader needs to see:** Data format at each stage, the transformation applied, and where information is added or lost.

**Conceptual:** Horizontal pipeline diagram. Each stage is a labeled box with a small example showing what the data looks like before and after (e.g., a raw sentence becomes tokens becomes embeddings). Arrows connect stages left to right. 6-10 nodes.

**Technical:** Pipeline with data shape annotations at each stage ([N, 512] -> [N, 512, 768]). Transformation parameters noted (vocabulary size, embedding dimension). Branching paths for multi-modal inputs shown as parallel tracks that merge. 10-15 nodes.

**Formal:** Pipeline with mathematical transformation at each stage (x_i -> E[x_i] + P[i] where E is the embedding matrix and P is the positional encoding matrix). Dimension changes tracked as tensor algebra. 12-20 nodes.

**Generation format:** Mermaid left-to-right flowchart (all levels), with inline examples at Conceptual.

### 2.5 Quantitative Results (Comparisons)

**What the reader needs to see:** Relative performance across conditions, which method wins, by how much, and whether differences are consistent across metrics.

**Conceptual:** Grouped bar chart or dot plot comparing methods on 1-2 primary metrics. Methods ordered by performance. The paper's contribution highlighted in a distinct color. Absolute numbers shown; no statistical notation. 4-8 data series.

**Technical:** Multi-metric comparison table rendered as a heatmap or small-multiple bar charts. Confidence intervals or standard deviations shown. Ablation results as a waterfall chart showing incremental contribution of each component. Statistical significance markers where reported. 6-12 data series.

**Formal:** Full results table reproduced with additional annotations: effect sizes, p-values, confidence intervals. Pareto frontier plots for multi-objective comparisons. Scaling curves with fitted power laws and extrapolation ranges. 8-15 data series.

**Generation format:** SVG chart (all levels). Mermaid lacks chart primitives.

### 2.6 Quantitative Results (Distributions / Relationships)

**What the reader needs to see:** Data shape, cluster structure, correlation patterns, density concentrations.

**Conceptual:** Scatter plot or simplified heatmap with regions annotated in plain language ("these cluster together because they share X property"). Axis labels use descriptive names, not variable names. 1-2 plots.

**Technical:** Full scatter/heatmap with axis scales, color bar legends, correlation coefficients annotated. Multiple subplots comparing conditions. Marginal distributions shown where relevant. 2-4 plots.

**Formal:** Same as Technical, plus overlaid parametric fits, kernel density estimates, or statistical test results. Mathematical relationship equations annotated directly on the plot. 2-6 plots.

**Generation format:** SVG (all levels).

### 2.7 Qualitative Results / Case Studies

**What the reader needs to see:** Input/output pairs, with annotations highlighting the features the paper wants the reader to notice.

**Conceptual:** Side-by-side input/output display with colored overlays or arrows pointing to the relevant features. Brief natural-language captions explaining what to look for. 2-4 examples.

**Technical:** Same layout with quantitative annotations (confidence scores, token probabilities, pixel-level metrics). Failure cases included alongside successes with labeled failure modes. 3-6 examples.

**Formal:** Comprehensive example grid with statistical summary of patterns across examples. Cross-referenced with the formal metrics from the quantitative results section. 4-8 examples.

**Generation format:** HTML grid with inline images or text blocks (if examples are textual). SVG for annotated overlays.

**Generation note:** This content type often requires reproducing or referencing the paper's own figures. For MVP, when the content involves images (generated samples, attention maps), the visual should describe what the reader would see with a structured text layout rather than attempting image generation. When examples are textual (translation pairs, generated text), inline rendering is feasible.

### 2.8 Theoretical Claim / Proof Structure

**What the reader needs to see:** The logical dependency chain from assumptions through intermediate results to the conclusion.

**Conceptual:** A proof map rendered as a directed tree. Root node is the main theorem. Child nodes are the lemmas or intermediate results it depends on. Leaf nodes are the assumptions. Each node has a 1-sentence plain-language summary of what it states. 8-12 nodes.

**Technical:** Same tree structure with formal statement summaries at each node. Proof technique labeled on each edge (induction, contradiction, construction, application of lemma X). Key equations shown at each node. 12-18 nodes.

**Formal:** Full proof outline as a numbered tree with complete formal statements. Each node includes the formal statement, the proof sketch, and the key algebraic manipulations. Side annotations show where each assumption is consumed. 18-25 nodes.

**Generation format:** Mermaid top-down flowchart (Conceptual), SVG tree (Technical/Formal).

### 2.9 Problem Formulation / Mathematical Setup

**What the reader needs to see:** The variables, their roles (given, optimized, constrained), the objective function, and the mapping from formal notation to real-world meaning.

**Conceptual:** A "cast of characters" diagram: a visual glossary showing each variable or quantity as a labeled icon or box, with arrows indicating "given," "find" and "subject to" relationships. The objective expressed in words with a corresponding simple diagram showing what "better" means (higher accuracy, lower loss, closer to target). 6-10 nodes.

**Technical:** The same structure with formal notation introduced alongside each element. The optimization landscape sketched (if low-dimensional). Constraints shown as regions in the diagram. The connection between loss function terms and their roles labeled. 10-15 nodes.

**Formal:** Full mathematical program rendered in standard form (minimize f(x) subject to g(x) <= 0, h(x) = 0). Accompanied by a diagram showing the feasible region, gradient directions, and optimality conditions. Dual variables introduced if relevant to the paper. 12-20 nodes.

**Generation format:** SVG (all levels, due to mixed math/diagram content).

### 2.10 Conceptual Framework / Taxonomy

**What the reader needs to see:** The classification axes, the categories, their hierarchical relationships, and representative examples in each category.

**Conceptual:** A tree diagram or nested set diagram. Each category is a labeled node with 1-2 example methods or papers. Classification criteria stated at each branch point. 8-15 nodes.

**Technical:** Same structure with formal classification criteria (e.g., "uses parameter sharing: yes/no"). Representative methods annotated with key distinguishing properties. Coverage gaps or debated classifications noted. 12-20 nodes.

**Formal:** Formal taxonomy with mathematical characterization of each category where applicable. Venn diagram overlays showing where categories share properties. Complexity or expressiveness ordering if relevant. 15-25 nodes.

**Generation format:** Mermaid tree (Conceptual), SVG (Technical/Formal).

### 2.11 System / Deployment Architecture

**What the reader needs to see:** Component roles, communication paths, data storage locations, and operational flow (request handling, failure recovery).

**Conceptual:** Box-and-line diagram with major system components. Communication arrows labeled with what is sent ("request," "embeddings," "gradient updates"). External dependencies (databases, APIs) shown as distinct shapes. 8-12 nodes.

**Technical:** Same diagram with protocol annotations (gRPC, HTTP, message queue), latency/throughput numbers, and replication/sharding indicators. Failure domains marked. Configuration parameters annotated. 12-20 nodes.

**Formal:** Full deployment diagram in a UML-adjacent style. Includes resource specifications, autoscaling rules, consistency model annotations, and the complete request lifecycle from ingress to response. 18-25 nodes.

**Generation format:** Mermaid flowchart with subgraphs (Conceptual/Technical), SVG (Formal).

---

## 3. Failure-Prone Content Types and Fallback Strategies

### 3.1 Purely Negative Results

**The problem:** The paper's contribution is showing that something does not work, or that a previously reported result does not replicate. There is no process to diagram and no architecture to draw. The "result" is an absence.

**Fallback strategy:** A structured comparison visual showing the expected outcome vs. the actual outcome. Format: two-column layout with the original claim on the left and the contradicting evidence on the right, connected by annotations explaining the discrepancy. For non-replication studies, a bar chart showing the original reported numbers alongside the replication attempt numbers, with confidence intervals, communicates the finding directly. This follows the principle from Cleveland and McGill (1984) that position-along-a-common-scale is the most accurately perceived visual encoding for quantitative comparison.

### 3.2 Theoretical Contributions with No Spatial/Process Structure

**The problem:** Papers proving bounds, impossibility results, or complexity classifications. The contribution is a logical relationship, not a spatial or temporal one. A generic concept map adds nothing the text doesn't already say.

**Fallback strategy:** Proof maps (described in Section 2.8) serve well when the contribution is a theorem with a multi-step proof. For contributions that are single results (e.g., "we prove this problem is NP-hard"), the visual should be an implication diagram: a directed graph from assumptions to conclusion with the reduction or construction shown as a labeled intermediate node. For complexity classifications, a Hasse diagram or containment diagram of complexity classes with the paper's result highlighted is standard in the field and communicates the contribution's position in the landscape.

When the theoretical contribution genuinely has no structure beyond "A implies B under conditions C," a structured text block (assumption list, arrow, conclusion) is the correct visual. Forcing a diagram onto a single implication produces noise.

### 3.3 Dataset and Benchmark Papers

**The problem:** The contribution is a resource, not a method. The paper describes what data was collected, how it was annotated and what properties it has. Standard process diagrams capture the collection pipeline but miss the point, which is usually the dataset's characteristics.

**Fallback strategy:** A multi-part visual. (1) The collection/annotation pipeline as a standard data pipeline diagram (Section 2.4). (2) Dataset statistics as a small-multiple chart: distribution of classes, sample lengths, annotation agreement rates. (3) A few representative examples shown in a grid. The combination of pipeline + statistics + examples covers the three things a reader evaluates when deciding whether to use a dataset: how it was made, what it contains and what the data looks like.

### 3.4 Empirical Findings About Existing Systems

**The problem:** Papers like "Scaling Laws for Neural Language Models" (Kaplan et al., 2020) or probing studies. The contribution is an observed relationship, not a new method. Architecture diagrams are irrelevant. The finding often lives in a curve or a table.

**Fallback strategy:** The visual IS the result. Reproduce the key finding as a chart: the scaling curve, the probing accuracy across layers, the correlation between model size and downstream performance. At Conceptual depth, annotate the chart with plain-language descriptions of what the trend means. At Technical depth, add the fitted functional form and parameter values. At Formal depth, include confidence bands, the fitting procedure and residual analysis.

This is one of the few content types where the visual should be generated from data extracted from the paper rather than from the text description. If the paper includes tables, the system should render them as charts rather than re-stating numbers in boxes.

### 3.5 Survey / Position Papers

**The problem:** The contribution is an argument or an organization of existing work, not a technical artifact. A single diagram cannot capture a 30-page survey.

**Fallback strategy:** For surveys, the primary visual is a taxonomy diagram (Section 2.10) covering the paper's organizational framework. A timeline of the surveyed methods can supplement this if the paper has a historical dimension. For position papers, the visual should be an argument map: claims connected to supporting evidence and counter-arguments, structured as a directed graph. This follows Walton's argumentation schemes, which provide a classification of argument structures suitable for diagramming.

### 3.6 Multi-Type Sections

**The problem:** Many paper sections mix content types. A "Methods" section might describe the architecture, the training procedure and the loss function in sequence. A "Results" section might alternate between quantitative comparisons and qualitative examples.

**Fallback strategy:** This is a classification problem, not a visualization problem. The system should segment the section into sub-sections by content type and generate separate visuals for each. The segmentation heuristic: a content type boundary occurs where the text shifts from describing one kind of thing (structure, process, numbers, examples) to another. Paragraph boundaries are a reasonable proxy. If a section is short enough that segmentation would produce fragments too small to visualize, default to the content type that occupies the most text.

---

## 4. Classification Approach

A hybrid approach works best: heuristic pre-classification based on section metadata, refined by an LLM classifier operating on the section text.

### 4.1 Heuristic Pre-Classification

Section-level metadata provides strong priors for content type. These heuristics are drawn from Liakata et al.'s (2012) work on scientific discourse annotation and from empirical patterns in CS paper structure.

**Section title signals:**

|Title pattern|Likely content type(s)|
|---|---|
|"Architecture," "Model," "Framework"|Architecture Description|
|"Algorithm," "Procedure," "Method" (with pseudocode)|Algorithm Walkthrough|
|"Training," "Optimization," "Learning"|Training/Optimization Procedure|
|"Data," "Dataset," "Preprocessing," "Collection"|Data Pipeline|
|"Results," "Experiments," "Evaluation," "Benchmarks"|Quantitative Results (Comparisons)|
|"Analysis," "Ablation"|Quantitative Results (Comparisons or Distributions)|
|"Qualitative," "Examples," "Case Study," "Visualization"|Qualitative Results|
|"Theory," "Proof," "Theorem," "Bounds"|Theoretical Claim / Proof|
|"Problem," "Formulation," "Setup," "Notation"|Problem Formulation|
|"Related Work," "Background," "Survey"|Conceptual Framework / Taxonomy|
|"System," "Infrastructure," "Deployment," "Serving"|System Architecture|

**Content density signals:**

|Signal|Interpretation|
|---|---|
|Equation density > 3 per 500 words|Likely Formal content: Problem Formulation, Theoretical Claim, or Training Procedure (loss derivation)|
|Table presence|Likely Quantitative Results (Comparisons)|
|Pseudocode block present|Algorithm Walkthrough|
|Figure references to images/samples|Qualitative Results|
|Citation density > 5 per 500 words|Likely survey content: Conceptual Framework / Taxonomy|
|Numbered list structure|Algorithm Walkthrough or Proof Structure|

**Accuracy estimate for heuristics alone:** Sufficient for an initial assignment in roughly 70-75% of sections. Fails on sections with generic titles ("Method" could be architecture, algorithm or training), sections that mix types, and sections where the title misrepresents the content.

### 4.2 LLM Classification

The LLM classifier operates on the section text after heuristic pre-classification has produced a prior. The prompt structure:

```
You are classifying a section of a computer science research paper to determine 
what type of visual explanation would best help a reader understand it.

The section title is: {section_title}
The section text is: {section_text}

Classify this section into one or more of the following content types. 
If the section contains multiple content types, list them in order of 
proportion (most text first) and identify the approximate boundary 
(e.g., "paragraphs 1-3 are type X, paragraphs 4-6 are type Y").

Content types:
1. ARCHITECTURE - describes the structure/components of a model or system
2. ALGORITHM - describes a step-by-step procedure
3. TRAINING - describes how model parameters are updated, loss functions, 
   optimization schedules
4. DATA_PIPELINE - describes data collection, preprocessing, transformation
5. QUANTITATIVE_COMPARISON - presents numerical results comparing methods, 
   configurations, or conditions
6. QUANTITATIVE_DISTRIBUTION - presents data distributions, correlations, 
   or functional relationships
7. QUALITATIVE_RESULTS - shows concrete examples of system inputs/outputs
8. THEORETICAL - presents theorems, proofs, bounds, or formal arguments
9. PROBLEM_FORMULATION - defines the mathematical setup, variables, objective
10. TAXONOMY - categorizes or surveys related work, methods, or concepts
11. SYSTEM_ARCHITECTURE - describes deployment, infrastructure, engineering 
    concerns

For each content type you assign, state in one sentence what the reader 
needs to understand from this section.

Respond in this format:
PRIMARY: [type] - [what the reader needs to understand]
SECONDARY: [type] - [what the reader needs to understand] (if applicable)
BOUNDARY: [where the content type changes] (if applicable)
```

**Failure modes and mitigations:**

_Mixed sections._ The prompt explicitly handles this by requesting boundary identification. The system generates separate visuals for each segment. In testing, LLMs reliably identify content type shifts at paragraph boundaries but struggle with sentence-level interleaving (e.g., a paragraph that describes an architecture component and its training loss in the same sentence). For interleaved content, the system should default to the primary type and include elements of the secondary type as annotations.

_Ambiguous content types._ The main confusion pairs are: Architecture vs. System Architecture (resolved by whether the description is about computation or infrastructure), Algorithm vs. Training Procedure (resolved by whether parameters are being updated), and Problem Formulation vs. Theoretical Claim (resolved by whether the section is stating a problem or proving something about it). The heuristic pre-classification helps disambiguate: if the section contains equations but no QED or proof-structure markers, it is more likely Problem Formulation.

_Sections that are primarily textual discussion._ Introduction, Conclusion and Discussion sections often contain no content type from the taxonomy. These sections are candidates for no visual or a lightweight visual (a summary diagram recapping the paper's contribution in the context established by the text). The classifier should have a NONE/SUMMARY option for these cases.

### 4.3 Recommended Pipeline

1. **Parse** the paper into sections using heading detection.
2. **Compute** heuristic features for each section: title match, equation count, table presence, pseudocode presence, figure reference count, citation density.
3. **Run** the LLM classifier with the heuristic features included as additional context in the prompt (e.g., "This section contains 5 equations and 2 tables").
4. **Resolve** conflicts: if heuristics and LLM disagree, prefer the LLM for content type assignment but use the heuristic to flag the section for the optional refinement loop.
5. **Select** the visual format from the mapping table (Section 2) based on the assigned content type and the user's current depth level.
6. **Generate** the visual with a prompt that specifies: the content type, the target depth level, the visual format, the node limit, and the requirement that every visual element correspond to something in the text.

### 4.4 Existing Work and References

**Automatic figure type recommendation.** The closest work is from Chen et al. (2019, "Figure Captioning with Reasoning and Sequence-Level Training"), which classifies existing figures in papers but does not recommend figure types for text that lacks figures. Harper and Agrawala's "Deconstructing and Restyling D3 Visualizations" (2014) provides a taxonomy of visualization types but operates on existing visualizations, not on source text.

**Data type to chart type mapping.** Mackinlay's APT (A Presentation Tool, 1986) established the foundational framework: given a data type (nominal, ordinal, quantitative) and a set of relations, select the visual encoding that maximizes perceptual accuracy based on Cleveland and McGill's ranking of visual variables. Moritz et al.'s Draco (2019) extends this with a constraint-based system that encodes visualization design knowledge as soft and hard constraints, solved via answer set programming. Wongsuphasawat et al.'s Voyager (2016, 2017) implements this interactively. These frameworks apply directly to content types 2.5 and 2.6 (quantitative results), where the input is structured data. They do not extend to explanatory diagrams for architecture descriptions or process walkthroughs, where the input is natural language describing structure rather than a data table.

**Taxonomy of diagram types in CS explanations.** Distill.pub's articles provide the closest thing to an established vocabulary of explanation diagram types for ML concepts. Olah et al.'s work on neural network visualization (2018) uses: computational graphs, feature visualization grids, attribution maps, and "zoomed-in" circuit diagrams. The Illustrated Transformer (Alammar, 2018) and similar blog-format explanations use: block diagrams with data flow, matrix operation visualizations, step-by-step animations, and attention weight heatmaps. No formal taxonomy of these diagram types exists in the literature. The mapping table in Section 2 of this document is, to the best of my knowledge, the first attempt to systematize them by content type and depth level.

**SciSketch** (Yale NLP, github.com/yale-nlp/SciSketch) generates draw.io XML from paper text using a self-refinement loop. It handles the generation problem but not the classification problem: it produces a single diagram type (concept-map-style) regardless of content type. The refinement loop (generate, render, check with multimodal model, revise) is directly applicable to the generation step of this pipeline.

**Paper Mage** (AI2) parses PDFs into structured sections with figure/table/equation detection. Relevant to the parsing step (4.3 step 1) but does not classify sections by content type.

**Semantic Reader** (AI2) provides inline term definitions and citation context. Relevant to the pre-training principle (glossary generation) but does not generate explanatory visuals.

**Additional relevant work:**

- Kembhavi et al. (2016), "A Diagram Is Worth a Dozen Images" -- classifies diagram types in science textbooks (flow charts, bar charts, tables, tree diagrams, etc.) and trains a model to parse them. The classification taxonomy is relevant as a reference for diagram type vocabulary, though it classifies existing diagrams rather than recommending types for text.
- Lee et al. (2017), "Human Factors in Visualization Research" -- provides a framework for matching visualization types to cognitive tasks (identify, compare, summarize, discover) that maps onto the "understanding required" dimension in the taxonomy above.
- Zhu et al. (2023), "AutomaTikZ" -- generates TikZ diagrams from text descriptions using language models. Demonstrates LLM capability for technical diagram generation but handles only the rendering step, not type selection.