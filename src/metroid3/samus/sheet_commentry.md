# Image commentary

This file in some cases has a very specific ordering. For instance, the first
instance of any usage list will also be the pose that is used to import the
image. For this reason, some poses will be out of order and this is intentional
because a pose might be mirrored in its first occurance (grapple), or perhaps
the way that it will be present in the ROM is different before and after
modification (e.g. screw attack).

# Property legend

- `name`  
  The name of the image
- `parent`  
  The parent image this image inherits properties from.
- `layout`  
  The row, column position of the image on the sprite sheet.
- `scale`  
  Integer up scale when rendered in the sprite sheet.
- `shift`  
  Vertical shift for the purpose of alignement in the sprite sheet (applied after `scale`).
- `spacing`  
  Extra distance to the next image along the horizontal axis (negative on the left side, positive on the right side).
  Assumed to be zero if missing, not accessed from a parent.
- `dimensions`  
  The main dimensions of this image around an origio which denote the middle of the sprite in-game.
- `dimensions+`  
  Additional secondary dimensions that make up this image.
- `palette range`  
  The range (inclusive, exclusive) of colors from the master palette that make up the palette for this image.
- `tilemap setting`  
  The palette, priority settings for tilemap fields in the rom data.
- `dma`  
  The bank, ordinal sequence of images in the main DMA banks.
- `force table`  
  Mandate referencing this image through the upper/lower table.
- `import table`  
  Import this image from the rom using the upper/lower table.
- `usage`  
  The animation and pose that this image is used in.

# Image descriptions

- `elevator`  
  Used when wearing power suit and standing on an elevator
- `launcher`  
  Used when wearing power suit and loading from a save point
- `elevator_varia`  
  Used when wearing varia or gravity suit and standing on an elevator
- `launcher_varia`  
  Used when wearing varia or gravity suit and loading from a save point
- `stand_{left|right}`  
  A neutral standing pose, used while...standing
- `stand_{left|right}_heavy`  
  While standing with low health, begins to breathe heavily
- `stand_{left|right}_aim_up`  
  Standing, but aiming directly upwards
- `stand_{left|right}_aim_diag_up`  
  Standing, but aiming diagonally upwards, or lifting the cannon further upwards
- `stand_turn_{left|neutral|right}_aim_up`  
  While standing and aiming up (or diag up), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `stand_{left|right}_aim_diag_down`  
  Standing, but aiming diagonally downwards
- `stand_turn_{left|neutral|right}_aim_down`  
  While standing and aiming down (or diag down), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `crouch_{left|right}`  
  While crouching but not aiming, Samus breathes
- `crouch_{left|right}_heavy`  
  While crouching with low health, begins to breathe heavily
- `run_{left|right}`  
  Normal running pose, used while...running
- `run_{left|right}_shooting`  
  Running while firing the arm cannon, so that the arm is extended forward
- `run_{left|right}_aim_diag_up`  
  Running while aiming diagonally upwards
- `run_{left|right}_aim_diag_down`  
  Running while aiming diagonally downwards
- `jump_left_start_spin_jump`  
  As Samus begins to do a spinjump/spacejump/screwattack, this pose shows her transitioning off the ground before spinning
- `jump_right_start_spin_jump`  
  As Samus begins to do a spinjump/spacejump/screwattack, this pose shows her transitioning off the ground before spinning
- `spin_jump_{left|right}`  
  Samus spin jumping counterclockwise/clockwise
- `spin_jump_{left_land|right}`  
  After a spin jump, Samus makes contact with the ground
- `grapple_wall_{left|right}`  
  Samus is grappled to a wall on the right/left, preparing to jump out to the left/right
- `wall_jump_{left|right}`  
  Samus when she is priming to jump leftwards off of a right/left wall
- `wall_jump_launch_{left|right}`  
  Samus when she is beginning the jump leftwards off of a right/left wall
- `space_jump_{left|right}`  
  Samus space jumping counterclockwise/clocwise, or combined with sparks for screw attack
- `morphball_stand_{left|right}`  
  When the morphball is not moving, it rotates through these poses
- `morphball_roll_{left|right}`  
  When the morphball is rolling on the ground, it rotates through these poses
- `morphball_fall_{left|right}`  
  When the morphball is either jumping or falling, it rotates through these poses
- `moonwalk_{left|right}`  
  Samus is facing right/left, but walking backwards, i.e. walking left/right
- `moonwalk_{left|right}_aim_diag_up`  
  Samus is facing right/left, but walking backwards, and aiming diagonally up
- `moonwalk_{left|right}_aim_diag_down`  
  Samus is facing right/left, but walking backwards, and aiming diagonally down
- `xray_crouch_{left|right}`
 - While using the xray scope, a light cone appears from Samus's visor and she looks in the correct direction
- `stand_turn_{left|neutral|right}`
 - While standing, Samus is turning from right to left, or left to right, and is presently facing 'more left/forward/more right'
- `crouch_turn_{left|neutral|right}`
 - While crouching, Samus is turning from right to left, or left to right, and is presently facing 'more left/forward/more right'
- `jump_{left|right}_begin`  
  As Samus begins to jump in a non-spin way, she bends her knees to push off of the ground
- `jump_{left|right}`  
  When Samus jumps up without spinning, or when she is starting a vertical shinespark
- `jump_{left|right}_land`  
  While facing left/right, Samus makes contact with the ground after a regular jump or a fall
- `jump_{left|right}_aim_up_begin`  
  As Samus begins to jump while aiming upwards, she bends her knees to push off of the ground
- `jump_{left|right}_aim_up`  
  When Samus jumps and shoots upwards
- `jump_{left|right}_aim_up_land`  
  While facing left/right and aiming up, Samus makes contact with the ground after a jump or a fall
- `jump_{left|right}_aim_diag_up_begin`  
  As Samus begins to jump while aiming diagonally upwards, she bends her knees to push off of the ground
- `jump_{left|right}_aim_diag_up`  
  When Samus jumps and shoots diagonally upwards
- `jump_{left|right}_aim_diag_up_land`  
  While facing left/right and aiming diagonally up, Samus makes contact with the ground after a jump or a fall
- `jump_{left|right}_shoot`  
  When Samus jumps and shoots
- `jump_{left|right}_shoot_land`  
  While facing left/right and shooting, Samus makes contact with the ground after a jump or a fall.
  Also used for falling out of crystal flash.
- `jump_{left|right}_aim_diag_down_begin`  
  As Samus begins to jump while aiming diagonally upwards, she bends her knees to push off of the ground
- `jump_{left|right}_aim_diag_down`  
  When Samus jumps and shoots diagonally downwards
- `jump_{left|right}_aim_diag_down_land`  
  While facing left/right and aiming diagonally downwards (or downwards), Samus makes contact with the ground after a jump or a fall
- `jump_{left|right}_aim_down`
 - When Samus jumps and shoots downwards
- `jump_turn_{left|neutral|right}`  
  While jumping, Samus is turning from right to left, or left to right, and is presently facing 'more left/forward/more right'
- `jump_turn_{left|neutral|right}_aim_up`  
  While jumping and aiming up (or diag up), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `jump_turn_{left|neutral|right}_aim_down`  
  While jumping and aiming down (or diag down), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `fall_{left|right}`  
  When Samus walks off of a ledge, or if she unmorphs in midair, or if she is falling after being hurt.
  At first goes through poses 0-2 but after a long fall transitions to the remaining poses
- `fall_{left|right}_aim_up`  
  When Samus falls and shoots upwards
- `fall_{left|right}_aim_diag_up`  
  When Samus falls and shoots diagonally upwards
- `fall_{left|right}_shoot`  
  When Samus walks off of a ledge, or if she unmorphs in midair, or if she is falling after being hurt AND is shooting.
  At first goes through poses 0-2 but after a long fall transitions to the remaining poses
- `fall_{left|right}_aim_diag_down`  
  When Samus falls and shoots diagonally downwards
- `fall_{left|right}_aim_down`  
  When Samus falls and shoots downwards
- `roll_out_{left|right}`  
  Samus is damage boosting. She faces right but because of damage she jumps to the left and rolls out.
- `morph_{left|right}`  
  When Samus is transitioning to or from the morphball, and when she converts between morphball and crystal flash
- `bonk_{left|right}`  
  Samus is facing left/right and takes damage but does not boost. This pose is also held for a long time leading up to the death animation.
- `crouch_{left|right}_aim_up`  
  Samus is crouching and aims straight up
- `crouch_{left|right}_aim_diag_up`  
  Samus is crouching and aims diagonally up, or is lifting the cannon to aim directly up
- `crouch_{left|right}_aim_diag_down`  
  Samus is crouching and aims diagonally down
- `sparks_{left|right}`  
  When using screw attack, a halo of sparks surrounds Samus, and pulses every few frames
- `fall_turn_{left|neutral|right}`  
  While jumping, Samus is turning from right to left, or left to right, and is presently facing 'more left/forward/more right'
- `fall_turn_{left|neutral|right}_aim_up`  
  While falling and aiming up (or diag up), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `fall_turn_{left|neutral|right}_aim_down`  
  While falling and aiming up (or diag up), Samus is turning from right to left, or left to right,
  and is presently facing 'more left/forward/more right'
- `crouch_turn_{left|neutral|right}_aim_up`  
  While crouching and aiming up (or diag up), Samus is turning from right to left, or left to right,
  and is presently facing 'more right/forward/more right'
- `crouch_turn_{left|neutral|right}_aim_down`  
  While crouching and aiming diagonally down, Samus is turning from right to left, or left to right,
  and is presently facing 'more right/forward/more right'
- `grabbed_{left|right}`  
  Caught by Draygon
- `grabbed_{left|right}_aim_diag_up`  
  Caught by Draygon and aiming diagonally upwards
- `grabbed_{left|right}_shoot`  
  Caught by Draygon and firing forwards
- `grabbed_{left|right}_aim_diag_down`  
  Caught by Draygon and aiming diagonally downwards
- `grabbed_{left|right}_struggling`  
  Caught by Draygon and trying to get away by moving the D-pad
- `crouch_transition_{left|right}`  
  Samus is transitioning from crouching to standing, or vice versa
- `crouch_transition_{left|right}_aim_up`  
  Samus is transitioning from crouching to standing, or vice versa, while aiming upwards
- `crouch_transition_{left|right}_aim_diag_up`  
  Samus is transitioning from crouching to standing, or vice versa, while aiming diagonally upwards
- `crouch_transition_{left|right}_aim_diag_down`  
  Samus is transitioning from crouching to standing, or vice versa, while aiming diagonally downwards
- `shine_spark_{left|right}`  
  Samus is shinesparking (i.e. super jumping) either laterally or diagonally
- `shine_spark_vertical_{left|right}`  
  Samus is shinesparking (i.e. super jumping) vertically while facing left/right
- `crystal_flash_{left|right}`  
  The floating silhouette inside of the crystal flash bubble
- `crystal_bubble_{left|right}_large`  
  The pulsating bubble around crystal flash. This is duplicated thrice to complete a full circle"
- `grapple_{clockwise|counterclockwise}`  
  While swinging forward/clockwise or backwards/counterclockwise (i.e. facing 'left/right'),
  the game chooses an appropriate angle subject to an 11.25 degree arc. Upside-down poses are mirrored
- `grapple_{clockwise|counterclockwise}_pulled_in`  
  When Samus is begin pulled upward by the grapple but is not swinging"
- `grapple_{clockwise|counterclockwise}_hanging`  
  When Samus is hanging from the grapple and not swinging"
- `supplication_left`  
  Samus is paralyzed/exhuasted/drained during the Metroid or Mother Brain sequences.
  The first of these poses is held still for a short while while Samus gains hyper beam.
- `supplication_right`  
  Samus is paralyzed/exhuasted/drained during the Metroid or Mother Brain sequences
- `supplication_look_up_{left|right}`  
  Samus is drained, but looks up to watch a storyline sequence
- `supplication_left_collapse`  
  After taking a rainbow beam to the face, this pose is used when Samus makes contact with the ground, before collapsing
- `supplication_left_stand_attempt`  
  During the Mother Brain fight, while paralyzed, Samus makes several attempts to stand up
- `death_{left|right}`  
  Samus's body emerging from the broken suit during the death sequence
- `death_{left|right}_pieces`  
  Samus's suit pieces exploding during the death sequence
- `file_select_head`  
  Classically, these are three heads that turn to face the camera when the save file is selected
- `file_select_visor`  
  Classically, there is a flash that goes across Samus's front-facing visor after the save file is selected
- `file_select_cursor_array`  
  Classically, the cursor is constructed by rotating upwards through the list of missile bases,
  and the light on the tip moves up and down as 12321
- `file_select_piping`  
  This piping is used to construct the frame around SAMUS DATA in the menu
- `gun_port_right_aim_up`  
  These ports are superimposed over the cannon to simulate the cannon opening.
  They progress in a fast sequence to give the illusion that the cannon is opening/closing in real-time.
- `palette_block`  
  The rows are (top to bottom): power, varia, gravity, death, file select, and
  then one row with flash bubble colors, visor xray colors, then ship colors
