import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import Loading from '../components/Loading'
import Notice from '../components/Notice'
import Icon from '../components/Icon'
import { api, endpoints } from '../services/api'
import { getLearner } from '../utils/storage'
import CVMonitor from '../components/CVMonitor'

function formatCountdown(seconds) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}` }

export default function PracticePage() {
  const { unitId } = useParams()
  const learner = getLearner()
  const navigate = useNavigate()
  const [assessment, setAssessment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [numeric, setNumeric] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [decision, setDecision] = useState(null)
  const [scaffold, setScaffold] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const startedAt = useRef(Date.now())
  const breakStartedAt = useRef(null)
  const [breakState, setBreakState] = useState(null)
  const [breakCount, setBreakCount] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)

  useEffect(() => {
    if (!learner) { navigate('/'); return }
    api.post(endpoints.startAssessment, { learner_id: learner.id, unit_id: Number(unitId) }).then(async a => {
      const qs = await Promise.all(a.questions.map(id => api.get(endpoints.question(id))))
      setAssessment(a); setQuestions(qs.filter(q => q.unit_id === Number(unitId))); setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [learner?.id, unitId])

  const question = questions[index]

  function handleHighCue() {
    if (breakState || sessionEnded) return
    const nextCount = breakCount + 1
    setBreakCount(nextCount)
    if (nextCount >= 3) {
      setSessionEnded(true)
      return
    }
    breakStartedAt.current = Date.now()
    setBreakState({ stage: nextCount, seconds: nextCount === 1 ? 120 : 300 })
  }

  useEffect(() => {
    if (!breakState || sessionEnded) return
    const timer = setInterval(() => {
      setBreakState(current => {
        if (!current) return null
        if (current.seconds <= 1) return null
        return { ...current, seconds: current.seconds - 1 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [breakState, sessionEnded])

  useEffect(() => {
    if (!breakState && breakStartedAt.current != null) {
      startedAt.current += Date.now() - breakStartedAt.current
      breakStartedAt.current = null
    }
  }, [breakState])

  useEffect(() => {
  const shouldLock = Boolean(breakState || sessionEnded);

  document.body.style.overflow = shouldLock ? 'hidden' : '';

  return () => {
    document.body.style.overflow = '';
  };
}, [breakState, sessionEnded]);

  const answer = question?.question_type === 'MCQ' || question?.options?.length ? selected : numeric
  const isLast = index === questions.length - 1

  function resetQuestion() { setSelected(''); setNumeric(''); setSubmitted(null); setDecision(null); setScaffold(null); startedAt.current = Date.now() }

  async function submit() {
    if (!question || !answer.trim()) return
    setSubmitting(true); setError('')
    try {
      const response = await api.post(endpoints.answer(assessment.assessment_id), { question_id: question.id, answer, response_time_seconds: (Date.now() - startedAt.current) / 1000 })
      setSubmitted(response)
      const d = await api.post(endpoints.evaluate, { assessment_id: assessment.assessment_id, question_id: question.id })
      setDecision(d)
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  async function showScaffold() {
    try { setScaffold(await api.post(endpoints.scaffold, { assessment_id: assessment.assessment_id, question_id: question.id })) } catch (e) { setError(e.message) }
  }

  async function finishBaseline() {
    navigate(`/result/${assessment.assessment_id}`)
  }

  async function nextAdaptive() {
    setSubmitting(true)
    try {
      const next = await api.post(endpoints.nextQuestion, { assessment_id: assessment.assessment_id, question_id: question.id })
      if (next.recommended_question && next.next_assessment_id) {
        setAssessment({ ...assessment, assessment_id: next.next_assessment_id, questions: [next.recommended_question.id], assessment_type: 'Adaptive' })
        setQuestions([next.recommended_question]); setIndex(0); resetQuestion();
      } else { navigate(`/result/${assessment.assessment_id}`) }
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }

  if (loading) return <AppShell><div className="page narrow"><Loading label="Preparing your practice" /></div></AppShell>
  if (error && !question) return <AppShell><div className="page narrow"><Notice>{error}</Notice></div></AppShell>
  if (!question) return <AppShell><div className="page narrow"><Notice tone="success">There are no questions available for this section yet.</Notice></div></AppShell>

  return <AppShell><div className="page practice-page">
    <div className="practice-top"><button className="back-button" onClick={() => navigate('/dashboard')}><Icon name="back" /> Leave practice</button><span className="practice-type">{assessment.assessment_type === 'Adaptive' ? 'Adaptive practice' : 'Practice'} · {index + 1}{questions.length > 1 ? ` / ${questions.length}` : ''}</span></div>
    {error && <Notice>{error}</Notice>}
    <div className="question-layout">
      <section className="question-card">
        <div className="question-meta"><span>{question.topic || 'Fractions'}</span><span className="difficulty-dot">{question.difficulty}</span></div>
        <h1>{question.question_text}</h1>
        {question.options?.length > 0 ? <div className="answer-options">{question.options.map(option => <button key={option} disabled={submitted !== null} className={`answer-option ${selected === option ? 'selected' : ''} ${submitted && selected === option ? (submitted.correct ? 'correct' : 'incorrect') : ''}`} onClick={() => setSelected(option)}><span className="option-marker">{String.fromCharCode(65 + question.options.indexOf(option))}</span><span>{option}</span>{submitted && selected === option && <Icon name={submitted.correct ? 'check' : 'close'} size={19} />}</button>)}</div> : <div className="numeric-answer"><label>Your answer</label><input inputMode="decimal" value={numeric} disabled={submitted !== null} onChange={e => setNumeric(e.target.value)} placeholder="Type your answer" /></div>}
        {!submitted ? <button className="primary-button primary-button--submit" disabled={!answer.trim() || submitting} onClick={submit}>{submitting ? <Loading label="Checking" /> : <>Check answer <Icon name="arrow" size={18} /></>}</button> : <div className={`feedback ${submitted.correct ? 'feedback--correct' : 'feedback--wrong'}`}><div className="feedback-title"><span className="feedback-icon"><Icon name={submitted.correct ? 'check' : 'lightbulb'} size={18} /></span>{submitted.correct ? 'Nice work.' : 'Let’s work through it.'}</div>{decision?.reason && <p>{submitted.correct ? decision.reason : 'A hint can help you get unstuck before seeing the full explanation.'}</p>}{!submitted.correct && <button className="secondary-button" onClick={showScaffold}><Icon name="lightbulb" size={17} /> {scaffold ? 'Show next step' : 'Get a hint'}</button>}{scaffold && <div className="scaffold"><div className="scaffold-label">{scaffold.title}</div><p>{scaffold.content}</p>{scaffold.steps?.length > 0 && <ol>{scaffold.steps.map(step => <li key={step}>{step}</li>)}</ol>}{scaffold.reveals_answer && <div className="answer-reveal">Answer: {scaffold.correct_answer}</div>}</div>}</div>}
      </section>
      <aside className="practice-side"><div className="side-note"><Icon name="target" size={20} /><div><strong>Your next step is based on your answers.</strong><p>S.U.N.D.A.Y. adapts practice from the learning data it actually receives.</p></div></div><CVMonitor onHighCue={handleHighCue} paused={Boolean(breakState || sessionEnded)} /></aside>
    </div>
    {submitted && <div className="next-bar">{!isLast && assessment.assessment_type !== 'Adaptive' ? <button className="primary-button" onClick={() => { setIndex(i => i + 1); resetQuestion() }}>Next question <Icon name="arrow" size={18} /></button> : <><button className="ghost-button" onClick={finishBaseline}>See result <Icon name="arrow" size={18} /></button><button className="primary-button" onClick={nextAdaptive} disabled={submitting}>Continue adaptively <Icon name="sparkle" size={17} /></button></>}</div>}
    {breakState && !sessionEnded && <div className="wellness-overlay" role="dialog" aria-modal="true" aria-labelledby="wellness-break-title">
      <section className="wellness-dialog">
        <div className="wellness-symbol">☀️</div>
        <p className="eyebrow">A little pause</p>
        <h2 id="wellness-break-title">{breakState.stage === 1 ? 'Time for a mind refresh' : 'Let’s take a longer reset'}</h2>
        <p>{breakState.stage === 1 ? 'You’ve been showing sustained high facial cues. Step away from the question, relax your shoulders, and take a few comfortable breaths.' : 'High facial cues have returned after your first pause. Give yourself a little more time before continuing.'}</p>
        <div className="wellness-countdown" aria-live="polite">{formatCountdown(breakState.seconds)}</div>
        <span className="wellness-countdown-label">Time left in your {breakState.stage === 1 ? '2-minute' : '5-minute'} break</span>
        <p className="wellness-note">This is an optional-camera learning support cue, not a diagnosis. Your practice will resume when the timer ends.</p>
      </section>
    </div>}
    {sessionEnded && <div className="wellness-overlay" role="dialog" aria-modal="true" aria-labelledby="wellness-ended-title">
      <section className="wellness-dialog">
        <div className="wellness-symbol">🌙</div>
        <p className="eyebrow">Session complete</p>
        <h2 id="wellness-ended-title">We’ll continue tomorrow</h2>
        <p>You’ve had two pauses already. It’s a good time to wrap up this learning session and come back fresh tomorrow.</p>
        <p className="wellness-note">Your submitted answers are saved as you work. You can return to the dashboard now.</p>
        <button className="primary-button primary-button--large" onClick={() => navigate('/dashboard')}>Return to dashboard <Icon name="arrow" size={18} /></button>
      </section>
    </div>}
  </div></AppShell>
}
