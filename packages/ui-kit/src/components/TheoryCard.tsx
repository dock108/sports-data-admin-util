"use client";

import { useState } from "react";
import styles from "./TheoryCard.module.css";

export interface DataSource {
  name: string;
  cache_status: string;
  details?: string | null;
}

export interface TheoryResponse {
  summary: string;
  verdict: string;
  confidence: number;
  data_used: DataSource[];
  how_we_got_conclusion: string[];
  long_term_outcome_example: string;
  limitations: string[];
  guardrail_flags: string[];
  model_version?: string | null;
  evaluation_date?: string | null;

  likelihood_grade?: string;
  edge_estimate?: number | null;
  kelly_sizing_example?: string;
  pattern_frequency?: number | null;
  failure_periods?: string[];
  remaining_edge?: number | null;
  correlation_grade?: string;
  fundamentals_match?: boolean;
  volume_analysis?: string;
  likelihood_rating?: number | null;
  evidence_for?: string[];
  evidence_against?: string[];
  historical_parallels?: string[];
  missing_data?: string[];
  key_facts?: string[];
  assumptions?: string[];
  logical_fallacies?: string[];
  claim_text?: string;
  story_sections?: string[];
  claims_vs_evidence?: ClaimEvidence[];
  verdict_text?: string;
  confidence_score?: number | null;
  sources_used?: string[];
  fuels_today?: string[];
}

interface ClaimEvidence {
  claim: string;
  evidence: string;
  verdict: string;
}

interface TheoryCardProps {
  response: TheoryResponse;
  domain: "bets" | "crypto" | "stocks" | "conspiracies";
}

type ConspiracyResponseShape = TheoryResponse & {
  claim_text: string;
  story_sections: string[];
  claims_vs_evidence: ClaimEvidence[];
  verdict_text: string;
  confidence_score: number;
  sources_used: string[];
  fuels_today?: string[];
};

function DomainSection({ title, children, response }: { title: string; children: React.ReactNode; response: TheoryResponse }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.domainSection}>
      <button
        className={styles.domainSectionHeader}
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <h4 className={styles.domainSectionTitle}>{title}</h4>
        <span className={styles.toggleIcon}>{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <div className={styles.domainSectionContent}>{children}</div>}
    </div>
  );
}

function getConfidenceClass(score: number): string {
  if (score <= 20) return styles.confidenceLow;
  if (score <= 50) return styles.confidenceMedium;
  if (score <= 80) return styles.confidenceHigh;
  return styles.confidenceVeryHigh;
}

function formatVerdictLabel(verdict: string): string {
  if (!verdict) return "Verdict";
  return verdict;
}

function ConspiracyNarrativeCard({ response }: { response: ConspiracyResponseShape }) {
  const claim = response.claim_text || response.summary;
  const story = response.story_sections?.length ? response.story_sections : [response.summary];
  const claimsVsEvidence = response.claims_vs_evidence || [];
  const confidenceScore = response.confidence_score ?? Math.round((response.confidence || 0) * 100);
  const verdictText = response.verdict_text || response.verdict;
  const sources = response.sources_used && response.sources_used.length > 0 ? response.sources_used : ["Sources not specified"];
  const fuels = response.fuels_today && response.fuels_today.length > 0 ? response.fuels_today : [];

  return (
    <div className={styles.conspiracyCard}>
      <div className={styles.claimHeader}>
        <div>
          <p className={styles.claimLabel}>The Claim</p>
          <h2 className={styles.claimTitle}>{claim}</h2>
        </div>
        <div className={`${styles.confidenceBadge} ${getConfidenceClass(confidenceScore)}`}>
          <span className={styles.badgeValue}>{confidenceScore}</span>
          <span className={styles.badgeText}>/ 100</span>
        </div>
      </div>

      <div className={styles.sectionBlock}>
        <h3 className={styles.narrativeSectionTitle}>The Story Behind This Theory</h3>
        {story.map((paragraph, idx) => (
          <p key={idx} className={styles.storyParagraph}>
            {paragraph}
          </p>
        ))}
      </div>

      {claimsVsEvidence.length > 0 && (
        <div className={styles.sectionBlock}>
          <h3 className={styles.narrativeSectionTitle}>Claims vs Evidence</h3>
          <div className={styles.claimsGrid}>
            {claimsVsEvidence.map((item, idx) => (
              <div key={`${item.claim}-${idx}`} className={styles.claimRow}>
                <div className={styles.claimColumn}>
                  <span className={styles.claimLabel}>Claim</span>
                  <p>{item.claim}</p>
                </div>
                <div className={styles.evidenceColumn}>
                  <span className={styles.claimLabel}>Evidence</span>
                  <p>{item.evidence}</p>
                  <span className={`${styles.verdictTag} ${styles[`verdict-${item.verdict?.toLowerCase() || "unclear"}`]}`}>
                    {item.verdict?.toUpperCase() || "UNCLEAR"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.sectionBlock}>
        <h3 className={styles.narrativeSectionTitle}>Final Verdict</h3>
        <p className={styles.verdictText}>{formatVerdictLabel(verdictText)}</p>
      </div>

      <div className={styles.sectionBlock}>
        <h3 className={styles.narrativeSectionTitle}>Sources Consulted</h3>
        <ul className={styles.sourceList}>
          {sources.map((source, idx) => (
            <li key={`${source}-${idx}`}>{source}</li>
          ))}
        </ul>
      </div>

      {fuels.length > 0 && (
        <div className={styles.sectionBlock}>
          <h3 className={styles.narrativeSectionTitle}>What Fuels This Theory Today?</h3>
          <ul className={styles.sourceList}>
            {fuels.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TheoryCard({ response, domain }: TheoryCardProps) {
  const hasHardBlock = response.guardrail_flags.some((flag) => flag.startsWith("hard:"));

  if (hasHardBlock) {
    return (
      <div className={styles.card} style={{ borderColor: "#c33" }}>
        <h3 className={styles.title} style={{ color: "#c33" }}>
          Cannot Evaluate
        </h3>
        <p className={styles.message}>
          This theory cannot be evaluated due to guardrail restrictions.
        </p>
        {response.guardrail_flags.length > 0 && (
          <div className={styles.flags}>
            <strong>Restrictions:</strong>
            <ul>
              {response.guardrail_flags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (domain === "conspiracies") {
    return <ConspiracyNarrativeCard response={response as ConspiracyResponseShape} />;
  }

  return (
    <div className={styles.card}>
      {/* 1. Summary */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Summary</h3>
        <p className={styles.summary}>{response.summary}</p>
      </div>

      {/* 2. Verdict + Confidence */}
      <div className={styles.section}>
        <div className={styles.verdictHeader}>
          <h3 className={styles.verdict}>{response.verdict}</h3>
          <div className={styles.confidence}>
            Confidence: {(response.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* 3. Data we used */}
      {response.data_used.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Data We Used</h3>
          <ul className={styles.dataList}>
            {response.data_used.map((source, idx) => (
              <li key={idx} className={styles.dataItem}>
                <span className={styles.dataName}>{source.name}</span>
                <span className={styles[source.cache_status === "cached" ? "cached" : "fresh"]}>
                  {source.cache_status}
                </span>
                {source.details && <span className={styles.dataDetails}>{source.details}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. How we got the conclusion */}
      {response.how_we_got_conclusion.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>How We Got the Conclusion</h3>
          <ul className={styles.conclusionList}>
            {response.how_we_got_conclusion.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Long-term $100 example */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Long-term $100 Example</h3>
        <p className={styles.outcome}>{response.long_term_outcome_example}</p>
      </div>

      {/* 6. Limits / missing data */}
      {response.limitations.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Limits / Missing Data</h3>
          <ul className={styles.limitationsList}>
            {response.limitations.map((limitation, idx) => (
              <li key={idx}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 7. Meta */}
      <div className={styles.meta}>
        {response.guardrail_flags.length > 0 && (
          <div className={styles.metaItem}>
            <strong>Guardrail Flags:</strong> {response.guardrail_flags.join(", ")}
          </div>
        )}
        {response.model_version && (
          <div className={styles.metaItem}>
            <strong>Model:</strong> {response.model_version}
          </div>
        )}
        {response.evaluation_date && (
          <div className={styles.metaItem}>
            <strong>Evaluated:</strong> {new Date(response.evaluation_date).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Domain-specific fields with collapsible sections */}
      {domain === "bets" && (response.likelihood_grade || response.edge_estimate || response.kelly_sizing_example) && (
        <DomainSection title="Betting Analysis" response={response}>
          {response.likelihood_grade && (
            <div className={styles.domainField}>
              <strong>Likelihood Grade:</strong> <span className={styles.grade}>{response.likelihood_grade}</span>
            </div>
          )}
          {response.edge_estimate !== undefined && response.edge_estimate !== null && (
            <div className={styles.domainField}>
              <strong>Edge Estimate:</strong> <span className={styles.positive}>{(response.edge_estimate * 100).toFixed(1)}%</span>
            </div>
          )}
          {response.kelly_sizing_example && (
            <div className={styles.domainField}>
              <strong>Kelly Sizing Example:</strong>
              <p className={styles.exampleText}>{response.kelly_sizing_example}</p>
            </div>
          )}
        </DomainSection>
      )}

      {domain === "crypto" && (response.pattern_frequency !== undefined || response.failure_periods?.length || response.remaining_edge !== undefined) && (
        <DomainSection title="Pattern Analysis" response={response}>
          {response.pattern_frequency !== undefined && response.pattern_frequency !== null && (
            <div className={styles.domainField}>
              <strong>Pattern Frequency:</strong> <span className={styles.percentage}>{(response.pattern_frequency * 100).toFixed(0)}%</span>
            </div>
          )}
          {response.failure_periods && response.failure_periods.length > 0 && (
            <div className={styles.domainField}>
              <strong>Failed Periods:</strong>
              <ul className={styles.domainList}>
                {response.failure_periods.map((period, idx) => (
                  <li key={idx}>{period}</li>
                ))}
              </ul>
            </div>
          )}
          {response.remaining_edge !== undefined && response.remaining_edge !== null && (
            <div className={styles.domainField}>
              <strong>Remaining Edge:</strong> <span className={response.remaining_edge > 0 ? styles.positive : styles.negative}>
                {(response.remaining_edge * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </DomainSection>
      )}

      {domain === "stocks" && (response.correlation_grade || response.fundamentals_match !== undefined || response.volume_analysis) && (
        <DomainSection title="Fundamentals Analysis" response={response}>
          {response.correlation_grade && (
            <div className={styles.domainField}>
              <strong>Correlation Grade:</strong> <span className={styles.grade}>{response.correlation_grade}</span>
            </div>
          )}
          {response.fundamentals_match !== undefined && (
            <div className={styles.domainField}>
              <strong>Fundamentals Match:</strong> <span className={response.fundamentals_match ? styles.positive : styles.negative}>
                {response.fundamentals_match ? "Yes" : "No"}
              </span>
            </div>
          )}
          {response.volume_analysis && (
            <div className={styles.domainField}>
              <strong>Volume Analysis:</strong>
              <p className={styles.analysisText}>{response.volume_analysis}</p>
            </div>
          )}
        </DomainSection>
      )}
    </div>
  );
}
