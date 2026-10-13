# Real Unreal demo and acceptance checklist

The browser study is separate from the Unreal source prototype. To claim a working Niagara pack, make and record this real-engine scene after the plugin builds.

## Small test scene

Use an empty level, a camera and three basic surfaces with Physical Materials. Add one actor with `WSImpactComponent`, assign your four Niagara systems, and add a Blueprint keyboard trigger for each style. Use the actor's location plus an offset for the impact location; pass (0,0,1) for a floor-normal test. Add a line-trace interaction afterwards and route its blocking hit through `SpawnFromHit`.

Keep this first scene small: no Lumen showcase, Nanite environment or huge GPU effects are needed. Frame a neutral background so sparks, dust and transparent shards stay readable. Record an actual Unreal window showing each effect, a changed parameter and surface-based routing.

## Acceptance checks

- UHT and Development Editor build complete with no component errors.
- All four assets are assigned and each one-shot system finishes and auto-destroys.
- Intensity changes particle count; size changes sprite scale and velocity once; color changes visible tint.
- A rotated surface normal changes launch direction in the world-space emitter.
- A missing system, invalid location or non-blocking hit returns no spawned component.
- Repeated calls respect interval and active-effect cap.
- Physical Material tracing maps metal/concrete/glass as configured; unmapped surfaces fall back to concrete.
- ClearEffects and owner EndPlay remove spawned effects.
- Memory/particle count settle after bursts finish.
- Check effect cost on the actual PC with Unreal profiling tools; record engine version and machine specs.

These checks are not marked passed because no Unreal Editor is available in the creation environment.
