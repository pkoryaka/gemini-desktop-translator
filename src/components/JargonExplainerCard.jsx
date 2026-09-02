import React from 'react';
import { HelpCircle, Info, Sparkles, Tag, Globe2, BookOpen } from 'lucide-react';

export function JargonExplainerCard({ explanationData }) {
  if (!explanationData) return null;

  const {
    plainLanguageMeaning,
    detectedTone,
    jargonBreakdown = [],
    culturalNotes,
    detectedSourceLanguage
  } = explanationData;

  return (
    <div className="jargon-results-container">
      <div className="jargon-results-header">
        <div className="jargon-results-title">
          <BookOpen size={18} color="#c084fc" />
          <span>Plain Language & Jargon Breakdown</span>
          {detectedSourceLanguage && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
              (Detected: {detectedSourceLanguage})
            </span>
          )}
        </div>

        {detectedTone && (
          <div className="tone-badge" title="Detected tone of the original message">
            <Sparkles size={13} />
            <span>Tone: {detectedTone}</span>
          </div>
        )}
      </div>

      {/* Plain Language Meaning Box */}
      {plainLanguageMeaning && (
        <div className="plain-meaning-box">
          <div className="plain-meaning-label">What the person actually meant:</div>
          <div>{plainLanguageMeaning}</div>
        </div>
      )}

      {/* Jargon / Slang / Idiom Term Breakdown */}
      {jargonBreakdown && jargonBreakdown.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e9d5ff', marginTop: '6px', marginBottom: '6px' }}>
            Demystified Terms & Slang ({jargonBreakdown.length}):
          </div>
          <div className="jargon-terms-grid">
            {jargonBreakdown.map((item, idx) => (
              <div key={`jargon-${idx}`} className="jargon-term-card">
                <div className="term-header">
                  <span className="term-name">"{item.term}"</span>
                  {item.literalMeaning && (
                    <span className="term-literal">Lit: {item.literalMeaning}</span>
                  )}
                </div>
                <div className="term-intended">
                  <strong>Means:</strong> {item.intendedMeaning}
                </div>
                {item.nuance && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                    💡 {item.nuance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Context / Nuance */}
      {culturalNotes && (
        <div className="cultural-notes-box">
          <Globe2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Cultural / Context Note:</strong> {culturalNotes}
          </div>
        </div>
      )}
    </div>
  );
}
