// The 24 letters of the Ancient Greek alphabet, plus the table of letters
// that are genuinely mistaken for one another. Pure data: no logic here.
//
// Final sigma (ς) is deliberately absent — it is a positional variant, not a
// letter of the alphabet.

export const LETTERS = [
  { name: 'alpha', upper: 'Α', lower: 'α' },
  { name: 'beta', upper: 'Β', lower: 'β' },
  { name: 'gamma', upper: 'Γ', lower: 'γ' },
  { name: 'delta', upper: 'Δ', lower: 'δ' },
  { name: 'epsilon', upper: 'Ε', lower: 'ε' },
  { name: 'zeta', upper: 'Ζ', lower: 'ζ' },
  { name: 'eta', upper: 'Η', lower: 'η' },
  { name: 'theta', upper: 'Θ', lower: 'θ' },
  { name: 'iota', upper: 'Ι', lower: 'ι' },
  { name: 'kappa', upper: 'Κ', lower: 'κ' },
  { name: 'lambda', upper: 'Λ', lower: 'λ' },
  { name: 'mu', upper: 'Μ', lower: 'μ' },
  { name: 'nu', upper: 'Ν', lower: 'ν' },
  { name: 'xi', upper: 'Ξ', lower: 'ξ' },
  { name: 'omicron', upper: 'Ο', lower: 'ο' },
  { name: 'pi', upper: 'Π', lower: 'π' },
  { name: 'rho', upper: 'Ρ', lower: 'ρ' },
  { name: 'sigma', upper: 'Σ', lower: 'σ' },
  { name: 'tau', upper: 'Τ', lower: 'τ' },
  { name: 'upsilon', upper: 'Υ', lower: 'υ' },
  { name: 'phi', upper: 'Φ', lower: 'φ' },
  { name: 'chi', upper: 'Χ', lower: 'χ' },
  { name: 'psi', upper: 'Ψ', lower: 'ψ' },
  { name: 'omega', upper: 'Ω', lower: 'ω' }
];

/**
 * Letters that are actually confused with one another, by shape in either
 * case: Η/Ν/Π as capitals, θ/ο/σ as minuscules, and so on. Drives distractor
 * selection so that a card tests a real discrimination.
 * @type {Record<string, string[]>}
 */
export const CONFUSIONS = {
  alpha: ['lambda', 'delta'],
  beta: ['rho', 'psi'],
  gamma: ['tau', 'pi', 'rho'],
  delta: ['alpha', 'lambda'],
  epsilon: ['sigma', 'theta', 'xi'],
  zeta: ['xi', 'chi', 'sigma'],
  eta: ['nu', 'pi', 'mu'],
  theta: ['omicron', 'sigma', 'epsilon'],
  iota: ['tau', 'gamma', 'upsilon'],
  kappa: ['chi', 'lambda'],
  lambda: ['alpha', 'delta', 'chi'],
  mu: ['nu', 'upsilon', 'pi'],
  nu: ['upsilon', 'omega', 'mu'],
  xi: ['zeta', 'chi', 'psi'],
  omicron: ['theta', 'sigma', 'omega'],
  pi: ['gamma', 'tau', 'eta'],
  rho: ['pi', 'gamma', 'beta'],
  sigma: ['omicron', 'epsilon', 'theta'],
  tau: ['gamma', 'pi', 'iota'],
  upsilon: ['nu', 'gamma', 'mu'],
  phi: ['psi', 'theta', 'omega'],
  chi: ['kappa', 'xi', 'lambda'],
  psi: ['phi', 'xi', 'chi'],
  omega: ['omicron', 'upsilon', 'nu']
};
