"""Run from Tools > Execute Python Script in a freshly opened AbilityForge editor.
Creates missing starter materials and a blank map; existing assets are preserved.
"""
import unreal


def create_material(name, glow=False):
    path = "/Game/Materials/" + name
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        unreal.log("Preserving existing asset: " + path)
        return
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    material = tools.create_asset(name, "/Game/Materials", unreal.Material, unreal.MaterialFactoryNew())
    if not material:
        raise RuntimeError("Cannot create " + path)
    color = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionVectorParameter, -280, 0)
    color.set_editor_property("parameter_name", "Color")
    color.set_editor_property("default_value", unreal.LinearColor(0.2, 0.7, 0.9, 1.0))
    if glow:
        material.set_editor_property("shading_model", unreal.MaterialShadingModel.MSM_UNLIT)
        output = unreal.MaterialProperty.MP_EMISSIVE_COLOR
    else:
        output = unreal.MaterialProperty.MP_BASE_COLOR
        roughness = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant, -280, 180)
        roughness.set_editor_property("r", 0.7)
        unreal.MaterialEditingLibrary.connect_material_property(roughness, "", unreal.MaterialProperty.MP_ROUGHNESS)
    if not unreal.MaterialEditingLibrary.connect_material_property(color, "", output):
        raise RuntimeError("Cannot connect material color")
    unreal.MaterialEditingLibrary.recompile_material(material)
    if not unreal.EditorAssetLibrary.save_asset(path):
        raise RuntimeError("Cannot save " + path)
    unreal.log("Created " + path)


def main():
    # new_level closes the active map; do not discard unrelated unsaved work.
    if unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages():
        raise RuntimeError("Save your active map before running setup.")
    create_material("M_ForgeTint")
    create_material("M_ForgeGlow", glow=True)
    path = "/Game/Maps/AbilityArena"
    if not unreal.EditorAssetLibrary.does_asset_exist(path):
        levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        if not levels.new_level(path):
            raise RuntimeError("Could not create " + path)
        if not levels.save_current_level():
            raise RuntimeError("Could not save " + path)
        unreal.log("Created empty AbilityArena map; geometry is built by ForgeGameMode at runtime.")
    else:
        unreal.log("Preserving existing map: " + path)
    unreal.log("Setup complete. Open AbilityArena, select Play from Default Player Start, then Play. No Niagara systems were created.")


if __name__ == "__main__":
    main()
