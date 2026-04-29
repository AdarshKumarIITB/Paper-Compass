import type { Paper, Evaluation, Section, SectionExplanation, CitedPaper, Thread } from "./types";

export const mockPapers: Paper[] = [
  {
    id: "attention-is-all-you-need",
    title: "Attention Is All You Need",
    authors: [{ name: "Ashish Vaswani" }, { name: "Noam Shazeer" }, { name: "Niki Parmar" }, { name: "Jakob Uszkoreit" }],
    year: 2017,
    venue: "NeurIPS",
    abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
    status: "reading",
    citationCount: 98500,
    influentialCitationCount: 12400,
    contributionSummary: "Introduces the Transformer architecture, replacing recurrence with multi-head self-attention. Achieves state-of-the-art results on machine translation with significantly less training time.",
    lastInteraction: "2 hours ago",
    comprehensionProgress: 45,
    sourceQuery: "attention mechanisms in transformers",
  },
  {
    id: "bert-pretraining",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: [{ name: "Jacob Devlin" }, { name: "Ming-Wei Chang" }, { name: "Kenton Lee" }, { name: "Kristina Toutanova" }],
    year: 2019,
    venue: "NAACL",
    abstract: "We introduce a new language representation model called BERT...",
    status: "evaluated",
    citationCount: 72000,
    influentialCitationCount: 8900,
    contributionSummary: "Proposes bidirectional pre-training for language representations using masked language modeling and next-sentence prediction. Sets new benchmarks across 11 NLP tasks.",
    lastInteraction: "3 days ago",
    comprehensionProgress: 0,
    sourceQuery: "attention mechanisms in transformers",
  },
  {
    id: "vision-transformer",
    title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: [{ name: "Alexey Dosovitskiy" }, { name: "Lucas Beyer" }, { name: "Alexander Kolesnikov" }],
    year: 2021,
    venue: "ICLR",
    abstract: "While the Transformer architecture has become the de-facto standard for NLP tasks...",
    status: "discovered",
    citationCount: 31000,
    influentialCitationCount: 4200,
    contributionSummary: "Applies a pure transformer directly to sequences of image patches, achieving excellent results on image classification when pre-trained on large datasets.",
    lastInteraction: "1 week ago",
    sourceQuery: "vision transformers",
  },
  {
    id: "gpt-3",
    title: "Language Models are Few-Shot Learners",
    authors: [{ name: "Tom Brown" }, { name: "Benjamin Mann" }, { name: "Nick Ryder" }, { name: "Melanie Subbiah" }],
    year: 2020,
    venue: "NeurIPS",
    abstract: "Recent work has demonstrated substantial gains on many NLP tasks...",
    status: "completed",
    citationCount: 45000,
    influentialCitationCount: 6100,
    contributionSummary: "Demonstrates that scaling language models greatly improves few-shot performance, sometimes reaching competitiveness with fine-tuning approaches that use task-specific data.",
    lastInteraction: "2 weeks ago",
    comprehensionProgress: 100,
    sourceQuery: "large language models",
  },
  {
    id: "resnet",
    title: "Deep Residual Learning for Image Recognition",
    authors: [{ name: "Kaiming He" }, { name: "Xiangyu Zhang" }, { name: "Shaoqing Ren" }, { name: "Jian Sun" }],
    year: 2016,
    venue: "CVPR",
    abstract: "Deeper neural networks are more difficult to train...",
    status: "evaluated",
    citationCount: 145000,
    influentialCitationCount: 18000,
    contributionSummary: "Introduces skip connections that enable training of very deep networks. Wins ImageNet 2015 with 152-layer networks, showing that depth improves accuracy when residual learning is used.",
    lastInteraction: "1 month ago",
    sourceQuery: "deep learning architectures",
  },
  {
    id: "diffusion-models",
    title: "Denoising Diffusion Probabilistic Models",
    authors: [{ name: "Jonathan Ho" }, { name: "Ajay Jain" }, { name: "Pieter Abbeel" }],
    year: 2020,
    venue: "NeurIPS",
    abstract: "We present high quality image synthesis results using diffusion probabilistic models...",
    status: "discovered",
    citationCount: 12000,
    influentialCitationCount: 2800,
    contributionSummary: "Shows that diffusion models can generate high-quality images by learning to reverse a gradual noising process, achieving results competitive with GANs.",
    lastInteraction: "5 days ago",
    sourceQuery: "generative models",
  },
  {
    id: "batch-norm",
    title: "Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift",
    authors: [{ name: "Sergey Ioffe" }, { name: "Christian Szegedy" }],
    year: 2015,
    venue: "ICML",
    abstract: "Training Deep Neural Networks is complicated by the fact that the distribution of each layer's inputs changes...",
    status: "completed",
    citationCount: 48000,
    influentialCitationCount: 5500,
    contributionSummary: "Introduces batch normalization to stabilize training of deep networks, enabling higher learning rates and reducing sensitivity to initialization.",
    lastInteraction: "2 months ago",
    comprehensionProgress: 100,
    sourceQuery: "deep learning architectures",
  },
  {
    id: "gan",
    title: "Generative Adversarial Nets",
    authors: [{ name: "Ian Goodfellow" }, { name: "Jean Pouget-Abadie" }, { name: "Mehdi Mirza" }],
    year: 2014,
    venue: "NeurIPS",
    abstract: "We propose a new framework for estimating generative models via an adversarial process...",
    status: "evaluated",
    citationCount: 62000,
    influentialCitationCount: 7800,
    contributionSummary: "Introduces the adversarial training framework where a generator and discriminator compete, enabling the generation of realistic synthetic data without explicit density estimation.",
    lastInteraction: "3 weeks ago",
    sourceQuery: "generative models",
  },
];

export const mockEvaluation: Evaluation = {
  id: "eval-1",
  paperId: "attention-is-all-you-need",
  claimSummary: "This paper proposes the Transformer, a model architecture that eschews recurrence entirely and instead relies on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach new state of the art in translation quality after being trained for as little as twelve hours on eight GPUs.",
  methodOverview: "The Transformer uses stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. The encoder maps an input sequence of symbol representations to a sequence of continuous representations. The decoder then generates an output sequence of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.",
  methodVisual: `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <rect x="50" y="20" width="120" height="40" rx="6" fill="hsl(220, 52%, 49%)" opacity="0.15" stroke="hsl(220, 52%, 49%)" stroke-width="1.5"/>
    <text x="110" y="45" text-anchor="middle" font-size="13" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Input Embedding</text>
    <rect x="230" y="20" width="120" height="40" rx="6" fill="hsl(220, 52%, 49%)" opacity="0.15" stroke="hsl(220, 52%, 49%)" stroke-width="1.5"/>
    <text x="290" y="45" text-anchor="middle" font-size="13" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Output Embedding</text>
    <rect x="50" y="90" width="120" height="50" rx="6" fill="hsl(147, 40%, 39%)" opacity="0.15" stroke="hsl(147, 40%, 39%)" stroke-width="1.5"/>
    <text x="110" y="112" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Multi-Head</text>
    <text x="110" y="128" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Attention</text>
    <rect x="230" y="90" width="120" height="50" rx="6" fill="hsl(147, 40%, 39%)" opacity="0.15" stroke="hsl(147, 40%, 39%)" stroke-width="1.5"/>
    <text x="290" y="112" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Masked Multi-Head</text>
    <text x="290" y="128" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Attention</text>
    <rect x="50" y="170" width="120" height="40" rx="6" fill="hsl(147, 40%, 39%)" opacity="0.15" stroke="hsl(147, 40%, 39%)" stroke-width="1.5"/>
    <text x="110" y="195" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Feed Forward</text>
    <rect x="230" y="170" width="120" height="40" rx="6" fill="hsl(147, 40%, 39%)" opacity="0.15" stroke="hsl(147, 40%, 39%)" stroke-width="1.5"/>
    <text x="290" y="195" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Feed Forward</text>
    <rect x="140" y="240" width="120" height="40" rx="6" fill="hsl(14, 55%, 50%)" opacity="0.15" stroke="hsl(14, 55%, 50%)" stroke-width="1.5"/>
    <text x="200" y="265" text-anchor="middle" font-size="13" fill="hsl(14, 55%, 50%)" font-family="DM Sans">Linear + Softmax</text>
    <line x1="110" y1="60" x2="110" y2="90" stroke="hsl(var(--muted-foreground))" stroke-width="1" marker-end="url(#arrow)"/>
    <line x1="290" y1="60" x2="290" y2="90" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
    <line x1="110" y1="140" x2="110" y2="170" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
    <line x1="290" y1="140" x2="290" y2="170" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
    <line x1="110" y1="210" x2="200" y2="240" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
    <line x1="290" y1="210" x2="200" y2="240" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
  </svg>`,
  evidenceAssessment: "The paper presents strong empirical evidence across two machine translation benchmarks (WMT 2014 English-to-German and English-to-French). The Transformer achieves a new state-of-the-art BLEU score of 28.4 on EN-DE and 41.0 on EN-FR. Ablation studies systematically vary key hyperparameters (number of heads, key/value dimensions, model size). However, statistical significance tests are not reported, and evaluation is limited to translation tasks only.",
  evidenceStrength: "solid",
  prerequisites: [
    { name: "Neural Networks Basics", level: "basic" },
    { name: "Sequence-to-Sequence Models", level: "intermediate" },
    { name: "Attention Mechanisms", level: "intermediate" },
    { name: "Matrix Multiplication", level: "basic" },
    { name: "Softmax Function", level: "basic" },
    { name: "Backpropagation", level: "intermediate" },
    { name: "Positional Encoding", level: "advanced" },
  ],
  readingTimeEstimates: { conceptual: 15, technical: 25, formal: 40 },
  createdAt: "2024-01-15",
};

export const mockSections: Section[] = [
  { id: "sec-1", paperId: "attention-is-all-you-need", title: "Introduction", order: 1 },
  { id: "sec-2", paperId: "attention-is-all-you-need", title: "Background", order: 2 },
  { id: "sec-3", paperId: "attention-is-all-you-need", title: "Model Architecture", order: 3 },
  { id: "sec-4", paperId: "attention-is-all-you-need", title: "Scaled Dot-Product Attention", order: 4 },
  { id: "sec-5", paperId: "attention-is-all-you-need", title: "Multi-Head Attention", order: 5 },
  { id: "sec-6", paperId: "attention-is-all-you-need", title: "Training", order: 6 },
  { id: "sec-7", paperId: "attention-is-all-you-need", title: "Results", order: 7 },
];

export const mockSectionExplanations: Record<string, Record<string, SectionExplanation>> = {
  "sec-3": {
    conceptual: {
      sectionId: "sec-3",
      depthLevel: "conceptual",
      explanationText: `The Transformer is built from two main parts: an **encoder** that reads the input sentence and a **decoder** that produces the output sentence. Think of the encoder as a reader that carefully considers how each word relates to every other word in the sentence — all at once, not one word at a time. The decoder works similarly but generates words one by one, each time looking back at what it's already produced and at the encoder's understanding of the input.\n\nThe key innovation is **self-attention**: instead of processing words in order (like reading left to right), the model can look at all words simultaneously and decide which ones are most relevant to each other. This is like being able to instantly see connections between any two words in a paragraph, no matter how far apart they are.\n\nEach layer of the Transformer also includes a simple **feed-forward network** that processes each position independently, adding the ability to transform the information gathered by attention into more useful representations.`,
      glossary: [],
      visual: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="80" width="160" height="80" rx="8" fill="hsl(220, 52%, 49%)" opacity="0.12" stroke="hsl(220, 52%, 49%)" stroke-width="1.5"/>
        <text x="100" y="115" text-anchor="middle" font-size="14" font-weight="600" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Encoder</text>
        <text x="100" y="135" text-anchor="middle" font-size="11" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Reads all words at once</text>
        <rect x="220" y="80" width="160" height="80" rx="8" fill="hsl(14, 55%, 50%)" opacity="0.12" stroke="hsl(14, 55%, 50%)" stroke-width="1.5"/>
        <text x="300" y="115" text-anchor="middle" font-size="14" font-weight="600" fill="hsl(14, 55%, 50%)" font-family="DM Sans">Decoder</text>
        <text x="300" y="135" text-anchor="middle" font-size="11" fill="hsl(14, 55%, 50%)" font-family="DM Sans">Generates one word at a time</text>
        <line x1="180" y1="120" x2="220" y2="120" stroke="hsl(147, 40%, 39%)" stroke-width="2" marker-end="url(#arrowG)"/>
        <text x="200" y="75" text-anchor="middle" font-size="10" fill="hsl(147, 40%, 39%)" font-family="DM Sans">attention</text>
        <text x="100" y="40" text-anchor="middle" font-size="12" fill="hsl(220, 52%, 49%)" font-family="DM Sans">"The cat sat on the mat"</text>
        <text x="300" y="40" text-anchor="middle" font-size="12" fill="hsl(14, 55%, 50%)" font-family="DM Sans">"Le chat..."</text>
        <line x1="100" y1="50" x2="100" y2="80" stroke="hsl(220, 52%, 49%)" stroke-width="1" stroke-dasharray="4"/>
        <line x1="300" y1="50" x2="300" y2="80" stroke="hsl(14, 55%, 50%)" stroke-width="1" stroke-dasharray="4"/>
      </svg>`,
      visualCaption: "The Transformer's encoder reads the full input simultaneously; the decoder generates output one token at a time, attending back to the encoder.",
      unfamiliarTerms: ["self-attention", "encoder", "decoder", "feed-forward network"],
    },
    technical: {
      sectionId: "sec-3",
      depthLevel: "technical",
      explanationText: `The Transformer follows an **encoder-decoder** structure. The encoder consists of N=6 identical layers, each containing two sub-layers: a **multi-head self-attention** mechanism and a position-wise **feed-forward network** (FFN). Each sub-layer employs a **residual connection** followed by **layer normalization**, so the output of each sub-layer is LayerNorm(x + Sublayer(x)).\n\nThe decoder also has N=6 identical layers with three sub-layers: masked multi-head self-attention (preventing positions from attending to subsequent positions), encoder-decoder attention (where queries come from the previous decoder layer and keys/values from the encoder output), and a feed-forward network.\n\nThe **self-attention mechanism** computes attention weights by taking dot products of queries with all keys, dividing by √d_k for numerical stability, and applying softmax. This produces a weighted sum of values. **Multi-head attention** runs h=8 parallel attention functions, each with different learned linear projections, concatenating and projecting the results.\n\nSince the architecture contains no recurrence, **positional encodings** using sine and cosine functions of different frequencies are added to the input embeddings to inject sequence order information.`,
      glossary: [
        { term: "Multi-head attention", definition: "Running multiple attention functions in parallel with different learned projections, then concatenating results." },
        { term: "Residual connection", definition: "Adding the input of a sub-layer directly to its output, enabling gradient flow through deep networks." },
        { term: "Layer normalization", definition: "Normalizing activations across features within a single training example, stabilizing training." },
        { term: "Positional encoding", definition: "Sine/cosine signals added to embeddings to convey token position since the model has no inherent notion of order." },
        { term: "Feed-forward network", definition: "Two linear transformations with a ReLU activation in between: FFN(x) = max(0, xW₁ + b₁)W₂ + b₂." },
      ],
      visual: `<svg viewBox="0 0 400 320" xmlns="http://www.w3.org/2000/svg">
        <text x="100" y="15" text-anchor="middle" font-size="13" font-weight="600" fill="hsl(var(--foreground))" font-family="DM Sans">Encoder (×6)</text>
        <rect x="30" y="25" width="140" height="40" rx="4" fill="hsl(220, 52%, 49%)" opacity="0.1" stroke="hsl(220, 52%, 49%)" stroke-width="1"/>
        <text x="100" y="50" text-anchor="middle" font-size="11" fill="hsl(220, 52%, 49%)" font-family="DM Sans">Input Embedding + PE</text>
        <rect x="30" y="75" width="140" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="100" y="97" text-anchor="middle" font-size="11" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Multi-Head Attention</text>
        <rect x="30" y="120" width="140" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="1"/>
        <text x="100" y="137" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" font-family="DM Sans">Add & Norm</text>
        <rect x="30" y="155" width="140" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="100" y="177" text-anchor="middle" font-size="11" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Feed Forward</text>
        <rect x="30" y="200" width="140" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="1"/>
        <text x="100" y="217" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" font-family="DM Sans">Add & Norm</text>
        <text x="300" y="15" text-anchor="middle" font-size="13" font-weight="600" fill="hsl(var(--foreground))" font-family="DM Sans">Decoder (×6)</text>
        <rect x="230" y="25" width="140" height="40" rx="4" fill="hsl(14, 55%, 50%)" opacity="0.1" stroke="hsl(14, 55%, 50%)" stroke-width="1"/>
        <text x="300" y="50" text-anchor="middle" font-size="11" fill="hsl(14, 55%, 50%)" font-family="DM Sans">Output Embedding + PE</text>
        <rect x="230" y="75" width="140" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="300" y="97" text-anchor="middle" font-size="11" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Masked Attention</text>
        <rect x="230" y="120" width="140" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="1"/>
        <text x="300" y="137" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" font-family="DM Sans">Add & Norm</text>
        <rect x="230" y="155" width="140" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="300" y="177" text-anchor="middle" font-size="11" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Cross-Attention</text>
        <rect x="230" y="200" width="140" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="1"/>
        <text x="300" y="217" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" font-family="DM Sans">Add & Norm</text>
        <rect x="230" y="235" width="140" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="300" y="257" text-anchor="middle" font-size="11" fill="hsl(147, 40%, 39%)" font-family="DM Sans">Feed Forward</text>
        <rect x="230" y="280" width="140" height="25" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" stroke-width="1"/>
        <text x="300" y="297" text-anchor="middle" font-size="10" fill="hsl(var(--muted-foreground))" font-family="DM Sans">Add & Norm</text>
        <path d="M170 175 L230 175" stroke="hsl(147, 40%, 39%)" stroke-width="1.5" stroke-dasharray="4" marker-end="url(#arrowG)"/>
      </svg>`,
      visualCaption: "Encoder and decoder stacks. Each encoder layer has self-attention + FFN; each decoder layer adds masked self-attention and cross-attention to encoder outputs.",
      unfamiliarTerms: ["multi-head self-attention", "residual connection", "layer normalization", "positional encodings", "feed-forward network"],
    },
    formal: {
      sectionId: "sec-3",
      depthLevel: "formal",
      explanationText: `The encoder maps an input sequence (x₁, ..., xₙ) to a sequence of continuous representations z = (z₁, ..., zₙ). Given z, the decoder generates an output sequence (y₁, ..., yₘ) one element at a time, with each step consuming the previously generated symbols as additional input (auto-regressive).\n\n**Scaled Dot-Product Attention** is defined as:\n\nAttention(Q, K, V) = softmax(QKᵀ / √d_k) V\n\nwhere Q ∈ ℝ^{n×d_k}, K ∈ ℝ^{m×d_k}, V ∈ ℝ^{m×d_v}. The scaling factor 1/√d_k counteracts the growth of dot products in high dimensions, which would push softmax into regions with extremely small gradients.\n\n**Multi-Head Attention** projects queries, keys, and values h times with different learned linear projections:\n\nMultiHead(Q, K, V) = Concat(head₁, ..., headₕ) Wᴼ\nwhere headᵢ = Attention(QWᵢᵠ, KWᵢᴷ, VWᵢⱽ)\n\nWith h=8 heads, d_k = d_v = d_model/h = 64.\n\n**Positional Encoding** uses sinusoidal functions:\nPE(pos, 2i) = sin(pos / 10000^{2i/d_model})\nPE(pos, 2i+1) = cos(pos / 10000^{2i/d_model})\n\nThis allows the model to attend to relative positions since PE(pos+k) can be represented as a linear function of PE(pos).`,
      glossary: [
        { term: "Scaled dot-product attention", definition: "Attention(Q,K,V) = softmax(QKᵀ/√d_k)V — scales dot products to prevent softmax saturation." },
        { term: "Multi-head attention", definition: "h parallel attention heads with independent projections, concatenated and linearly transformed." },
        { term: "Positional encoding", definition: "Sinusoidal functions PE(pos,2i) = sin(pos/10000^{2i/d}) injecting absolute and relative position information." },
      ],
      visual: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <text x="200" y="20" text-anchor="middle" font-size="13" font-weight="600" fill="hsl(var(--foreground))" font-family="JetBrains Mono">Attention(Q, K, V)</text>
        <rect x="30" y="40" width="80" height="35" rx="4" fill="hsl(220, 52%, 49%)" opacity="0.12" stroke="hsl(220, 52%, 49%)" stroke-width="1"/>
        <text x="70" y="62" text-anchor="middle" font-size="12" fill="hsl(220, 52%, 49%)" font-family="JetBrains Mono">Q·Kᵀ</text>
        <rect x="140" y="40" width="80" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="180" y="62" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="JetBrains Mono">/ √d_k</text>
        <rect x="250" y="40" width="80" height="35" rx="4" fill="hsl(147, 40%, 39%)" opacity="0.12" stroke="hsl(147, 40%, 39%)" stroke-width="1"/>
        <text x="290" y="62" text-anchor="middle" font-size="12" fill="hsl(147, 40%, 39%)" font-family="JetBrains Mono">softmax</text>
        <rect x="140" y="100" width="120" height="35" rx="4" fill="hsl(14, 55%, 50%)" opacity="0.12" stroke="hsl(14, 55%, 50%)" stroke-width="1"/>
        <text x="200" y="122" text-anchor="middle" font-size="12" fill="hsl(14, 55%, 50%)" font-family="JetBrains Mono">× V → output</text>
        <line x1="110" y1="57" x2="140" y2="57" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
        <line x1="220" y1="57" x2="250" y2="57" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
        <line x1="290" y1="75" x2="290" y2="90" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
        <line x1="290" y1="90" x2="200" y2="100" stroke="hsl(var(--muted-foreground))" stroke-width="1"/>
        <text x="200" y="160" text-anchor="middle" font-size="11" fill="hsl(var(--muted-foreground))" font-family="JetBrains Mono">MultiHead = Concat(head₁..headₕ)Wᴼ</text>
        <text x="200" y="180" text-anchor="middle" font-size="11" fill="hsl(var(--muted-foreground))" font-family="JetBrains Mono">headᵢ = Attention(QWᵢᵠ, KWᵢᴷ, VWᵢⱽ)</text>
      </svg>`,
      visualCaption: "Scaled dot-product attention computation flow: Q·Kᵀ → scale → softmax → multiply by V. Multi-head runs h parallel instances.",
      unfamiliarTerms: ["softmax", "dot product", "linear projection", "auto-regressive"],
    },
  },
  "sec-1": {
    conceptual: {
      sectionId: "sec-1",
      depthLevel: "conceptual",
      explanationText: `Before the Transformer, the best models for understanding and translating language processed words **one at a time**, in order — like reading a sentence left to right. These models (called **recurrent neural networks** or RNNs) were effective but slow, because each word had to wait for the previous word to be processed.\n\nThis paper asks: what if we could process all words **simultaneously** and let the model figure out which words are important to each other? That's the core idea behind the Transformer. By removing the sequential bottleneck, the model can be trained much faster on modern hardware (GPUs), which excel at parallel computation.\n\nThe result is a model that not only trains faster but actually produces **better translations** than previous approaches, establishing a new paradigm for language AI.`,
      glossary: [],
      unfamiliarTerms: ["recurrent neural networks", "parallel computation"],
    },
    technical: {
      sectionId: "sec-1",
      depthLevel: "technical",
      explanationText: `Sequence transduction models prior to this work relied on **recurrent architectures** (LSTMs, GRUs) with encoder-decoder structures and attention mechanisms [Bahdanau et al., 2015]. The inherently sequential nature of recurrence — computing h_t requires h_{t-1} — precludes parallelization within training examples, which becomes critical at longer sequence lengths.\n\nThe **attention mechanism** had already proven valuable as an addition to RNNs, allowing models to attend to relevant parts of the input regardless of distance. This paper takes the radical step of removing recurrence entirely, relying **solely on attention** to capture dependencies.\n\nThe resulting Transformer architecture achieves new state-of-the-art BLEU scores on WMT 2014 English-to-German (28.4) and English-to-French (41.0), while requiring significantly less computation to train — as little as 3.5 days on 8 GPUs compared to weeks for competitive RNN-based systems.`,
      glossary: [
        { term: "LSTM", definition: "Long Short-Term Memory — a recurrent architecture with gating mechanisms to manage long-range dependencies." },
        { term: "BLEU score", definition: "Bilingual Evaluation Understudy — a metric comparing machine-generated translations against reference translations." },
        { term: "Sequence transduction", definition: "Transforming one sequence into another, e.g. translating a sentence from English to French." },
      ],
      unfamiliarTerms: ["recurrent architectures", "LSTM", "encoder-decoder", "BLEU scores", "attention mechanism"],
    },
    formal: {
      sectionId: "sec-1",
      depthLevel: "formal",
      explanationText: `The computational complexity per layer for recurrent models is O(n · d²) where n is sequence length and d is representation dimensionality, with O(n) sequential operations preventing parallelization. Self-attention layers connect all positions with O(1) sequential operations at O(n² · d) per-layer complexity — favorable when n < d, which holds for most practical NLP settings (typical d = 512 or 1024).\n\nPrior work on reducing sequential computation includes the Extended Neural GPU, ByteNet, and ConvS2S, all using convolutional approaches. However, these require O(n/k) or O(log_k(n)) operations to relate signals from two arbitrary positions at distance n, making it harder to learn long-range dependencies. Self-attention achieves this in O(1) operations.\n\nThe paper demonstrates that the attention-only architecture achieves 28.4 BLEU on WMT 2014 EN-DE (improving over previous best ensemble by 2.0 BLEU) after training for 3.5 days on 8 P100 GPUs — an order of magnitude reduction in training cost.`,
      glossary: [
        { term: "Computational complexity", definition: "O(n²·d) for self-attention vs O(n·d²) for recurrence, with sequential operations O(1) vs O(n)." },
      ],
      unfamiliarTerms: ["computational complexity", "sequential operations", "convolutional approaches"],
    },
  },
};

export const mockCitedPapers: CitedPaper[] = [
  {
    id: "bahdanau-2015",
    title: "Neural Machine Translation by Jointly Learning to Align and Translate",
    authors: [{ name: "Dzmitry Bahdanau" }, { name: "Kyunghyun Cho" }, { name: "Yoshua Bengio" }],
    year: 2015,
    microEvaluation: "Introduces the attention mechanism for sequence-to-sequence models, allowing the decoder to focus on relevant parts of the input. This paper cites it as the foundational work that the Transformer extends by making attention the sole mechanism rather than an addition to recurrence.",
  },
  {
    id: "luong-2015",
    title: "Effective Approaches to Attention-based Neural Machine Translation",
    authors: [{ name: "Minh-Thang Luong" }, { name: "Hieu Pham" }, { name: "Christopher D. Manning" }],
    year: 2015,
    microEvaluation: "Explores global and local attention variants for NMT. Referenced as evidence that attention mechanisms were already proving effective, motivating the move to attention-only architectures.",
  },
];

export const mockThreads: Thread[] = [
  {
    id: "thread-1",
    term: "self-attention",
    sectionId: "sec-3",
    depthLevel: "technical",
    messages: [
      {
        id: "msg-1",
        role: "system",
        content: "**Self-attention** (also called intra-attention) is a mechanism where each element in a sequence computes attention weights over all other elements in the same sequence. Unlike cross-attention (where one sequence attends to another), self-attention lets a sequence 'look at itself.'\n\nFor each position, the model computes how relevant every other position is, producing a weighted combination that captures contextual relationships. In the sentence 'The cat sat on the mat because it was tired,' self-attention helps the model understand that 'it' refers to 'cat' by assigning high attention weight between these positions.",
        createdAt: "2024-01-15T10:00:00Z",
      },
    ],
  },
];

export const recentSearches = [
  "attention mechanisms in vision transformers",
  "diffusion models for text generation",
  "efficient fine-tuning of large language models",
  "graph neural networks for molecular property prediction",
  "reinforcement learning from human feedback",
];
