import { contactEmail } from "@/lib/site";
import { VIVADEO_PLANS } from "@/lib/plans";

export function BillingPlans() {
  return (
    <main className="billing-page fade-in">
      <header className="billing-page-header">
        <div>
          <h1>Plans for every archive</h1>
          <p>Start free, then choose the capacity that fits your footage.</p>
        </div>
        <span>Monthly pricing</span>
      </header>

      <div className="billing-card-grid">
        {VIVADEO_PLANS.map((plan) => (
          <article className={`billing-card${plan.featured ? " is-featured" : ""}`} key={plan.id}>
            <header>
              <div className="billing-card-name">
                <h2>{plan.name}</h2>
                {plan.featured ? <span>Recommended</span> : null}
              </div>
              <p>{plan.description}</p>
            </header>

            <div className="billing-card-price">
              <strong>{plan.priceLabel}</strong>
              <span>{plan.billingNote}</span>
            </div>

            <ul>
              {plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}
            </ul>

            {plan.id === "free" ? (
              <span className="billing-card-current">Included with your workspace</span>
            ) : plan.id === "enterprise" ? (
              <a href={`mailto:${contactEmail}?subject=Vivadeo%20Enterprise`}>Contact us</a>
            ) : (
              <button type="button" disabled>Coming soon</button>
            )}
          </article>
        ))}
      </div>

      <p className="billing-page-note">Paid plan activation will become available when billing is connected.</p>
    </main>
  );
}
