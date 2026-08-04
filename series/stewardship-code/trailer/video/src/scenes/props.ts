/**
 * Every scene takes this one flag.
 *
 * The build has two picture layers and each shot can be either. `overPlate: false` is the
 * original all-code render — vector geometry and silhouettes, no generated footage, which
 * is what shipped before the Flow plates existed and is still the fallback if a plate is
 * ever rejected. `overPlate: true` means a conformed Veo plate is already drawn behind the
 * scene, so the scene must skip its own background and render only the layers the plate
 * cannot supply: title cards, the KIN logo, the timing-critical click flashes, and the
 * atmosphere passes that tie plate and type together.
 *
 * Keeping both paths in one component (rather than forking into `LockPlate.tsx` etc.) is
 * what stops the title timings from drifting between the two versions — there is one
 * spring, one measured onset, one copy deck.
 */
export type SceneProps = {
  overPlate: boolean;
};
