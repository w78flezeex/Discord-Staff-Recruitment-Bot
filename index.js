require("dotenv").config()

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  ActivityType,
} = require("discord.js")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
})

const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  ADMIN_CHANNEL_ID: process.env.ADMIN_CHANNEL_ID,
  GUILD_ID: process.env.GUILD_ID,

  GAME_ROLES: {
    cs2: { id: process.env.ROLE_ID_CS2, name: "Counter-Strike 2" },
    valorant: { id: process.env.ROLE_ID_VALORANT, name: "Valorant" },
    minecraft: { id: process.env.ROLE_ID_MINECRAFT, name: "Minecraft" },
    gta: { id: process.env.ROLE_ID_GTA, name: "GTA V"  },
  },

  NOTIFICATION_ROLES: {
    updates: { id: process.env.ROLE_ID_UPDATES, name: "📢 Обновления", emoji: "📢" },
    events: { id: process.env.ROLE_ID_EVENTS, name: "🎉 События", emoji: "🎉" },
    news: { id: process.env.ROLE_ID_NEWS, name: "📰 Новости", emoji: "📰" },
    giveaways: { id: process.env.ROLE_ID_GIVEAWAYS, name: "🎁 Розыгрыши", emoji: "🎁" },
  },

  STAFF_POSITIONS: {
    helper: {
      name: "👥 Хелпер",
      description: "Помощь новичкам и поддержка пользователей",
      roleId: process.env.ROLE_ID_HELPER,
    },
    moderator: {
      name: "🛡️ Модератор",
      description: "Модерация чата и поддержание порядка",
      roleId: process.env.ROLE_ID_MODERATOR,
    },
    admin: {
      name: "⚡ Администратор",
      description: "Управление сервером и командой",
      roleId: process.env.ROLE_ID_ADMIN,
    },
  },
}

function validateConfig() {
  const required = [
    { key: "DISCORD_TOKEN", value: CONFIG.TOKEN },
    { key: "CLIENT_ID", value: CONFIG.CLIENT_ID },
    { key: "GUILD_ID", value: CONFIG.GUILD_ID },
    { key: "ADMIN_CHANNEL_ID", value: CONFIG.ADMIN_CHANNEL_ID },
  ]
}

const applications = new Map()

const commands = [
  new SlashCommandBuilder()
    .setName("setup-roles")
    .setDescription("Создать панель выбора ролей")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("setup-staff")
    .setDescription("Создать панель набора в стафф")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("staff-stats")
    .setDescription("Показать статистику заявок")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName("clear-applications")
    .setDescription("Очистить все заявки из памяти")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
]

async function registerCommands() {
  try {
    const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN)

    await rest.put(Routes.applicationGuildCommands(CONFIG.CLIENT_ID, CONFIG.GUILD_ID), { body: commands })

  } catch (error) {
  }
}

function setRandomStatus() {
  const activities = [
    { name: "заявки на стафф", type: ActivityType.Watching },
    { name: "за порядком на сервере", type: ActivityType.Watching },
    { name: "новых участников", type: ActivityType.Listening },
    { name: "систему ролей", type: ActivityType.Managing },
    { name: "администрацию сервера", type: ActivityType.Competing },
  ]

  const randomActivity = activities[Math.floor(Math.random() * activities.length)]
  client.user.setActivity(randomActivity.name, { type: randomActivity.type })
}

client.once("ready", async () => {

  setRandomStatus()

  setInterval(setRandomStatus, 30000)

  await registerCommands()
})

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction

      switch (commandName) {
        case "setup-roles":
          await handleSetupRoles(interaction)
          break
        case "setup-staff":
          await handleSetupStaff(interaction)
          break
        case "staff-stats":
          await handleStaffStats(interaction)
          break
        case "clear-applications":
          await handleClearApplications(interaction)
          break
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "game_roles_select") {
        await handleGameRolesSelect(interaction)
      } else if (interaction.customId === "notification_roles_select") {
        await handleNotificationRolesSelect(interaction)
      } else if (interaction.customId === "staff_application_select") {
        await handleStaffApplicationSelect(interaction)
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("staff_application_modal_")) {
        await handleStaffApplicationSubmit(interaction)
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("approve_application_")) {
        await handleApplicationApproval(interaction, true)
      } else if (interaction.customId.startsWith("reject_application_")) {
        await handleApplicationApproval(interaction, false)
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при обработке взаимодействия:", error)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Произошла ошибка при обработке запроса.", ephemeral: true })
    }
  }
})

async function handleSetupRoles(interaction) {
  await interaction.deferReply({ ephemeral: true })

  try {
    const gameRolesEmbed = new EmbedBuilder()
      .setTitle("🎮 Игровые роли")
      .setDescription(
        "Под этим постом вы можете выбрать себе игровую роль, нажав на соответствующую роли кнопку в меню выбора.",
      )
      .setColor("#7289DA")
      .setImage("https://media.discordapp.net/attachments/1176826062655721522/1389591045993402409/dbd61710-d38e-4390-935e-643a71c2cc6e.png?ex=68652d02&is=6863db82&hm=20652bc1fd5aa37b4c6ce67e4e4dbb148465d0e070d7ca73e5228757b6a58295&=&format=webp&quality=lossless&width=779&height=519")
      .setFooter({ text: "Система управления ролями" })
      .setTimestamp()

    const gameRolesSelect = new StringSelectMenuBuilder()
      .setCustomId("game_roles_select")
      .setPlaceholder("Выберите нужное!")
      .setMinValues(0)
      .setMaxValues(Object.keys(CONFIG.GAME_ROLES).length)

    Object.entries(CONFIG.GAME_ROLES).forEach(([key, role]) => {
      if (role.id) {
        gameRolesSelect.addOptions({
          label: role.name,
          value: key,
          emoji: role.emoji,
        })
      }
    })

    const gameRolesRow = new ActionRowBuilder().addComponents(gameRolesSelect)

    const notificationRolesEmbed = new EmbedBuilder()
      .setTitle("🔔 Роли оповещений")
      .setDescription(
        "Под этим постом вы можете выбрать себе роль оповещений, нажав на соответствующую роли кнопку в меню выбора.",
      )
      .setColor("#7289DA")
      .setFooter({ text: "Система уведомлений" })
      .setTimestamp()

    const notificationRolesSelect = new StringSelectMenuBuilder()
      .setCustomId("notification_roles_select")
      .setPlaceholder("Выберите нужное!")
      .setMinValues(0)
      .setMaxValues(Object.keys(CONFIG.NOTIFICATION_ROLES).length)

    Object.entries(CONFIG.NOTIFICATION_ROLES).forEach(([key, role]) => {
      if (role.id) {
        notificationRolesSelect.addOptions({
          label: role.name,
          value: key,
          emoji: role.emoji,
        })
      }
    })

    const notificationRolesRow = new ActionRowBuilder().addComponents(notificationRolesSelect)

    await interaction.channel.send({ embeds: [gameRolesEmbed], components: [gameRolesRow] })
    await interaction.channel.send({ embeds: [notificationRolesEmbed], components: [notificationRolesRow] })

    await interaction.editReply({
      content:
        "✅ **Панели ролей успешно созданы!**\n📋 Пользователи теперь могут выбирать роли через выпадающие меню.",
    })
  } catch (error) {
    console.error("Ошибка при создании панели ролей:", error)
    await interaction.editReply({ content: "❌ Произошла ошибка при создании панели ролей." })
  }
}

async function handleSetupStaff(interaction) {
  await interaction.deferReply({ ephemeral: true })

  try {
    const staffEmbed = new EmbedBuilder()
      .setTitle("👥 Набор в стафф")
      .setDescription(
        "💎 **Давно хотел быть частью сервера?** Проводить ивенты, следить за чатом, и т.п?\n💎 **Тогда ждём тебя в нашем дружном коллективе!**\n\n📋 Рассмотри должности ниже и выбери ту, что заинтересует тебя.",
      )
      .setColor("#5865F2")
      .setImage("https://media.discordapp.net/attachments/1389114437482451014/1389594393165562029/ChatGPT_Image_1_._2025_._16_11_53.png?ex=68653020&is=6863dea0&hm=1ef6c4629e69bca8962cb45cea75d318fa700f523237a0f07406219d643bd9ea&=&format=webp&quality=lossless&width=779&height=519")
      .addFields({
        name: "👥 Доступные позиции:",
        value: Object.values(CONFIG.STAFF_POSITIONS)
          .map((pos) => `${pos.name}\n*${pos.description}*`)
          .join("\n\n"),
        inline: false,
      })
      .setFooter({ text: "Система набора персонала" })
      .setTimestamp()

    const staffSelect = new StringSelectMenuBuilder()
      .setCustomId("staff_application_select")
      .setPlaceholder("Выберите категорию!")

    Object.entries(CONFIG.STAFF_POSITIONS).forEach(([key, position]) => {
      staffSelect.addOptions({
        label: position.name,
        value: key,
        description: position.description,
      })
    })

    const staffRow = new ActionRowBuilder().addComponents(staffSelect)

    await interaction.channel.send({ embeds: [staffEmbed], components: [staffRow] })

    await interaction.editReply({
      content:
        "✅ **Панель набора в стафф успешно создана!**\n📋 Пользователи теперь могут подавать заявки на должности.",
    })
  } catch (error) {
    console.error("Ошибка при создании панели стаффа:", error)
    await interaction.editReply({ content: "❌ Произошла ошибка при создании панели набора в стафф." })
  }
}

async function handleStaffStats(interaction) {
  const totalApplications = applications.size
  const applicationsByPosition = {}

  applications.forEach((app) => {
    applicationsByPosition[app.position] = (applicationsByPosition[app.position] || 0) + 1
  })

  const statsEmbed = new EmbedBuilder()
    .setTitle("📊 Статистика заявок")
    .setColor("#00FF00")
    .addFields(
      { name: "📋 Всего активных заявок", value: totalApplications.toString(), inline: true },
      { name: "⏰ Последнее обновление", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: "Статистика системы" })
    .setTimestamp()

  if (totalApplications > 0) {
    const positionStats = Object.entries(applicationsByPosition)
      .map(([pos, count]) => `${CONFIG.STAFF_POSITIONS[pos]?.name || pos}: **${count}**`)
      .join("\n")

    statsEmbed.addFields({ name: "📈 По должностям", value: positionStats, inline: false })
  }

  await interaction.reply({ embeds: [statsEmbed], ephemeral: true })
}

async function handleClearApplications(interaction) {
  const count = applications.size
  applications.clear()

  const clearEmbed = new EmbedBuilder()
    .setTitle("🗑️ Заявки очищены")
    .setDescription(`Успешно удалено **${count}** заявок из памяти.`)
    .setColor("#FF6B6B")
    .setFooter({ text: "Очистка данных системы" })
    .setTimestamp()

  await interaction.reply({ embeds: [clearEmbed], ephemeral: true })
}

async function handleGameRolesSelect(interaction) {
  const member = interaction.member
  const selectedRoles = interaction.values

  const allGameRoleIds = Object.values(CONFIG.GAME_ROLES)
    .map((role) => role.id)
    .filter((id) => id)
  const rolesToRemove = member.roles.cache.filter((role) => allGameRoleIds.includes(role.id))

  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove)
  }

  const rolesToAdd = selectedRoles.map((roleKey) => CONFIG.GAME_ROLES[roleKey].id).filter((id) => id)
  if (rolesToAdd.length > 0) {
    await member.roles.add(rolesToAdd)
  }

  const roleNames = selectedRoles.map((roleKey) => CONFIG.GAME_ROLES[roleKey].name).join(", ")
  const responseText =
    selectedRoles.length > 0
      ? `✅ **Игровые роли обновлены!**\n🎮 Выданы роли: ${roleNames}`
      : "✅ **Все игровые роли сняты**\n🎮 У вас больше нет игровых ролей"

  await interaction.reply({ content: responseText, ephemeral: true })
}

async function handleNotificationRolesSelect(interaction) {
  const member = interaction.member
  const selectedRoles = interaction.values

  const allNotificationRoleIds = Object.values(CONFIG.NOTIFICATION_ROLES)
    .map((role) => role.id)
    .filter((id) => id)
  const rolesToRemove = member.roles.cache.filter((role) => allNotificationRoleIds.includes(role.id))

  if (rolesToRemove.size > 0) {
    await member.roles.remove(rolesToRemove)
  }

  const rolesToAdd = selectedRoles.map((roleKey) => CONFIG.NOTIFICATION_ROLES[roleKey].id).filter((id) => id)
  if (rolesToAdd.length > 0) {
    await member.roles.add(rolesToAdd)
  }

  const roleNames = selectedRoles.map((roleKey) => CONFIG.NOTIFICATION_ROLES[roleKey].name).join(", ")
  const responseText =
    selectedRoles.length > 0
      ? `✅ **Роли оповещений обновлены!**\n🔔 Выданы роли: ${roleNames}`
      : "✅ **Все роли оповещений сняты**\n🔔 Вы больше не будете получать уведомления"

  await interaction.reply({ content: responseText, ephemeral: true })
}

async function handleStaffApplicationSelect(interaction) {
  const position = interaction.values[0]
  const positionName = CONFIG.STAFF_POSITIONS[position].name

  const existingApplication = Array.from(applications.values()).find((app) => app.userId === interaction.user.id)
  if (existingApplication) {
    await interaction.reply({
      content: `❌ **У вас уже есть активная заявка!**\n\n📋 **ID заявки:** \`${existingApplication.id}\`\n💼 **Должность:** ${existingApplication.positionName}\n⏰ **Подана:** <t:${Math.floor(existingApplication.timestamp.getTime() / 1000)}:R>\n\n⏳ Дождитесь рассмотрения текущей заявки перед подачей новой.`,
      ephemeral: true,
    })
    return
  }

  const modal = new ModalBuilder()
    .setCustomId(`staff_application_modal_${position}`)
    .setTitle(`Заявка: ${positionName}`)

  const nameInput = new TextInputBuilder()
    .setCustomId("applicant_name")
    .setLabel("Ваше имя")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50)
    .setPlaceholder("Введите ваше реальное имя")

  const ageInput = new TextInputBuilder()
    .setCustomId("applicant_age")
    .setLabel("Ваш возраст")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(3)
    .setPlaceholder("Введите ваш возраст (цифрами)")

  const whyUsInput = new TextInputBuilder()
    .setCustomId("why_us")
    .setLabel("Почему именно мы?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("Расскажите, что привлекает вас в нашем сервере...")

  const hobbiesInput = new TextInputBuilder()
    .setCustomId("hobbies")
    .setLabel("Чем увлекаетесь?")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500)
    .setPlaceholder("Опишите ваши увлечения и интересы...")

  const experienceInput = new TextInputBuilder()
    .setCustomId("experience")
    .setLabel("Опыт работы в данной сфере")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder("Расскажите о вашем опыте (необязательно)...")

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(ageInput),
    new ActionRowBuilder().addComponents(whyUsInput),
    new ActionRowBuilder().addComponents(hobbiesInput),
    new ActionRowBuilder().addComponents(experienceInput),
  )

  await interaction.showModal(modal)
}

async function handleStaffApplicationSubmit(interaction) {
  const position = interaction.customId.split("_")[3]
  const positionName = CONFIG.STAFF_POSITIONS[position].name

  const applicationData = {
    id: Date.now().toString(),
    userId: interaction.user.id,
    username: interaction.user.username,
    displayName: interaction.user.displayName || interaction.user.username,
    position: position,
    positionName: positionName,
    name: interaction.fields.getTextInputValue("applicant_name"),
    age: interaction.fields.getTextInputValue("applicant_age"),
    whyUs: interaction.fields.getTextInputValue("why_us"),
    hobbies: interaction.fields.getTextInputValue("hobbies"),
    experience: interaction.fields.getTextInputValue("experience") || "Не указано",
    timestamp: new Date(),
  }

  applications.set(applicationData.id, applicationData)

  const adminChannel = client.channels.cache.get(CONFIG.ADMIN_CHANNEL_ID)
  if (adminChannel) {
    const applicationEmbed = new EmbedBuilder()
      .setTitle("📋 Новая заявка на должность")
      .setColor("#00FF00")
      .setDescription(`**Поступила новая заявка на рассмотрение**`)
      .addFields(
        {
          name: "👤 Кандидат",
          value: `<@${applicationData.userId}>\n\`${applicationData.displayName}\``,
          inline: true,
        },
        { name: "💼 Должность", value: applicationData.positionName, inline: true },
        { name: "🆔 ID заявки", value: `\`${applicationData.id}\``, inline: true },
        { name: "📝 Имя", value: applicationData.name, inline: true },
        { name: "🎂 Возраст", value: applicationData.age, inline: true },
        { name: "⏰ Подана", value: `<t:${Math.floor(applicationData.timestamp.getTime() / 1000)}:R>`, inline: true },
        {
          name: "❓ Почему именно мы?",
          value:
            applicationData.whyUs.length > 1024
              ? applicationData.whyUs.substring(0, 1021) + "..."
              : applicationData.whyUs,
        },
        {
          name: "🎯 Увлечения",
          value:
            applicationData.hobbies.length > 1024
              ? applicationData.hobbies.substring(0, 1021) + "..."
              : applicationData.hobbies,
        },
        {
          name: "💼 Опыт",
          value:
            applicationData.experience.length > 1024
              ? applicationData.experience.substring(0, 1021) + "..."
              : applicationData.experience,
        },
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `Система набора • ID: ${applicationData.id}` })
      .setTimestamp()

    const approveButton = new ButtonBuilder()
      .setCustomId(`approve_application_${applicationData.id}`)
      .setLabel("✅ Принять")
      .setStyle(ButtonStyle.Success)

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_application_${applicationData.id}`)
      .setLabel("❌ Отклонить")
      .setStyle(ButtonStyle.Danger)

    const buttonRow = new ActionRowBuilder().addComponents(approveButton, rejectButton)

    await adminChannel.send({
      content: `🔔 **Новая заявка!** <@&${process.env.ADMIN_ROLE_ID || "ADMIN_ROLE_ID"}>`,
      embeds: [applicationEmbed],
      components: [buttonRow],
    })
  }

  const confirmEmbed = new EmbedBuilder()
    .setTitle("✅ Заявка успешно отправлена!")
    .setColor("#00FF00")
    .setDescription(`**Ваша заявка на должность ${applicationData.positionName} принята к рассмотрению**`)
    .addFields(
      { name: "📋 ID заявки", value: `\`${applicationData.id}\``, inline: true },
      { name: "💼 Должность", value: applicationData.positionName, inline: true },
      {
        name: "⏰ Время подачи",
        value: `<t:${Math.floor(applicationData.timestamp.getTime() / 1000)}:F>`,
        inline: true,
      },
    )
    .setFooter({ text: "Ожидайте рассмотрения администрацией" })
    .setTimestamp()

  await interaction.reply({ embeds: [confirmEmbed], ephemeral: true })
}

async function handleApplicationApproval(interaction, approved) {
  const applicationId = interaction.customId.split("_")[2]
  const application = applications.get(applicationId)

  if (!application) {
    await interaction.reply({
      content: "❌ **Заявка не найдена**\nВозможно, она уже была обработана или удалена.",
      ephemeral: true,
    })
    return
  }

  const user = await client.users.fetch(application.userId)
  const adminUser = interaction.user

  if (approved) {
    const guild = interaction.guild
    const member = await guild.members.fetch(application.userId)
    const staffRole = CONFIG.STAFF_POSITIONS[application.position]

    if (staffRole.roleId) {
      try {
        await member.roles.add(staffRole.roleId)
        console.log(`✅ Роль ${staffRole.name} выдана пользователю ${user.username}`)
      } catch (error) {
        console.error(`❌ Ошибка при выдаче роли: ${error}`)
      }
    }

    const acceptEmbed = new EmbedBuilder()
      .setTitle("🎉 Поздравляем! Ваша заявка одобрена!")
      .setColor("#00FF00")
      .setDescription(
        `**Добро пожаловать в команду!**\n\nВаша заявка на должность **${application.positionName}** была успешно рассмотрена и одобрена нашей администрацией.${staffRole.roleId ? "\n\n🎭 **Роль автоматически выдана!**" : ""}`,
      )
      .addFields(
        { name: "📋 ID заявки", value: `\`${applicationId}\``, inline: true },
        { name: "💼 Должность", value: application.positionName, inline: true },
        { name: "👨‍💼 Рассмотрел", value: adminUser.displayName || adminUser.username, inline: true },
        { name: "⏰ Время принятия", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: "Скоро с вами свяжется руководство для дальнейших инструкций" })
      .setTimestamp()

    try {
      await user.send({ embeds: [acceptEmbed] })
    } catch (error) {
      console.log(`❌ Не удалось отправить ЛС пользователю ${user.username}`)
    }

    await interaction.reply({
      content: `✅ **Заявка одобрена!**\n👤 Кандидат: <@${application.userId}>\n💼 Должность: **${application.positionName}**${staffRole.roleId ? "\n🎭 Роль автоматически выдана" : ""}\n📨 Уведомление отправлено в личные сообщения`,
      ephemeral: true,
    })
  } else {
    const rejectEmbed = new EmbedBuilder()
      .setTitle("😔 Ваша заявка отклонена")
      .setColor("#FF0000")
      .setDescription(
        `К сожалению, ваша заявка на должность **${application.positionName}** была отклонена нашей администрацией.`,
      )
      .addFields(
        { name: "📋 ID заявки", value: `\`${applicationId}\``, inline: true },
        { name: "💼 Должность", value: application.positionName, inline: true },
        { name: "👨‍💼 Рассмотрел", value: adminUser.displayName || adminUser.username, inline: true },
        { name: "⏰ Время отклонения", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: "Не расстраивайтесь! Вы можете подать заявку повторно через некоторое время" })
      .setTimestamp()

    try {
      await user.send({ embeds: [rejectEmbed] })
    } catch (error) {
      console.log(`❌ Не удалось отправить ЛС пользователю ${user.username}`)
    }

    await interaction.reply({
      content: `❌ **Заявка отклонена**\n👤 Кандидат: <@${application.userId}>\n💼 Должность: **${application.positionName}**\n📨 Уведомление отправлено в личные сообщения`,
      ephemeral: true,
    })
  }

  const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(approved ? "#00FF00" : "#FF0000")
    .setFooter({
      text: `Система набора • ${approved ? "✅ ПРИНЯТО" : "❌ ОТКЛОНЕНО"} • ${adminUser.displayName || adminUser.username} • ID: ${applicationId}`,
    })

  await interaction.message.edit({ embeds: [updatedEmbed], components: [] })

  applications.delete(applicationId)
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Необработанное отклонение промиса:", reason)
})

process.on("uncaughtException", (error) => {
  console.error("❌ Необработанное исключение:", error)
  process.exit(1)
})

validateConfig()

client.login(CONFIG.TOKEN).catch((error) => {
})
